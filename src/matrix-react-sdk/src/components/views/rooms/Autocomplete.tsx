/*
Copyright 2016 Aviral Dasgupta
Copyright 2017 New Vector Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { createRef, KeyboardEvent } from "react";
import classNames from "classnames";
import { flatMap } from "lodash";
import { Room } from "matrix-js-sdk/src/models/room";

import Autocompleter, { ICompletion, ISelectionRange, IProviderCompletions } from "../../../autocomplete/Autocompleter";
import SettingsStore from "../../../settings/SettingsStore";
import RoomContext from "../../../contexts/RoomContext";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType } from "matrix-js-sdk/src/@types/event";

const MAX_PROVIDER_MATCHES = 20;

export const generateCompletionDomId = (n: number): string => `mx_Autocomplete_Completion_${n}`;

interface IProps {
    // the query string for which to show autocomplete suggestions
    query: string;
    // method invoked with range and text content when completion is confirmed
    onConfirm: (completion: ICompletion) => void;
    // method invoked when selected (if any) completion changes
    onSelectionChange?: (partIndex: number) => void;
    selection: ISelectionRange;
    // The room in which we're autocompleting
    room: Room;
}

interface IState {
    completions: IProviderCompletions[];
    completionList: ICompletion[];
    selectionOffset: number;
    shouldShowCompletions: boolean;
    hide: boolean;
    forceComplete: boolean;
    displayMemberList: boolean;
}

export default class Autocomplete extends React.PureComponent<IProps, IState> {
    public autocompleter: Autocompleter;
    public queryRequested: string;
    public debounceCompletionsRequest: number;
    private containerRef = createRef<HTMLDivElement>();

    public static contextType = RoomContext;

    private cli: MatrixClient = MatrixClientPeg.get();
    private myUserId = this.cli.getUserId();

    public constructor(props: IProps) {
        super(props);

        this.state = {
            // list of completionResults, each containing completions
            completions: [],

            // array of completions, so we can look up current selection by offset quickly
            completionList: [],

            // how far down the completion list we are (THIS IS 1-INDEXED!)
            selectionOffset: 1,

            // whether we should show completions if they're available
            shouldShowCompletions: true,

            hide: false,

            forceComplete: false,

            displayMemberList: false, // 是否展示成员列表
        };
    }

    public componentDidMount(): void {
        this.autocompleter = new Autocompleter(this.props.room, this.context.timelineRenderingType);
        const displayMemberList = this.setDisplayMemberList(this.props.room);
        this.applyNewProps(displayMemberList);
        this.props.room?.on(RoomStateEvent.Events, this.onRoomStateEvents);
    }

    private applyNewProps(displayMemberList: boolean, oldQuery?: string, oldRoom?: Room): void {
        if (oldRoom && this.props.room.roomId !== oldRoom.roomId) {
            this.autocompleter.destroy();
            this.autocompleter = new Autocompleter(this.props.room);
        }

        // Query hasn't changed so don't try to complete it
        if (oldQuery === this.props.query) {
            return;
        }

        if (this.props.room.isPeopleRoom() || !displayMemberList) return; // 私聊没有@功能；不展示成员列表时没有@功能

        this.complete(this.props.query, this.props.selection);
    }

    public componentWillUnmount(): void {
        this.autocompleter.destroy();
        this.props.room?.off(RoomStateEvent.Events, this.onRoomStateEvents);
    }

    private onRoomStateEvents = (ev: MatrixEvent) => {
        switch (ev.getType()) {
            case EventType.RoomPowerLevels:
                // 权限更新
                this.setDisplayMemberList(this.props.room);
                break;
        }
    };

    private setDisplayMemberList(room: Room): boolean {
        if (!room) return;

        const displayMemberList = room.displayMemberList(this.myUserId);
        this.setState({
            displayMemberList,
        });
        return displayMemberList;
    }

    private complete(query: string, selection: ISelectionRange): Promise<void> {
        this.queryRequested = query;
        if (this.debounceCompletionsRequest) {
            clearTimeout(this.debounceCompletionsRequest);
        }
        if (query === "") {
            this.setState({
                // Clear displayed completions
                completions: [],
                completionList: [],
                // Reset selected completion
                selectionOffset: 1,
                // Hide the autocomplete box
                hide: true,
            });
            return Promise.resolve();
        }
        let autocompleteDelay = SettingsStore.getValue("autocompleteDelay");

        // Don't debounce if we are already showing completions
        if (this.state.completions.length > 0 || this.state.forceComplete) {
            autocompleteDelay = 0;
        }

        return new Promise((resolve) => {
            this.debounceCompletionsRequest = window.setTimeout(() => {
                resolve(this.processQuery(query, selection));
            }, autocompleteDelay);
        });
    }

    private processQuery(query: string, selection: ISelectionRange): Promise<void> {
        return this.autocompleter
            .getCompletions(query, selection, this.state.forceComplete, MAX_PROVIDER_MATCHES)
            .then((completions) => {
                // Only ever process the completions for the most recent query being processed
                if (query !== this.queryRequested) {
                    return;
                }
                this.processCompletions(completions);
            });
    }

    private processCompletions(completions: IProviderCompletions[]): void {
        const completionList = flatMap(completions, (provider) => provider.completions);

        // Reset selection when completion list becomes empty.
        let selectionOffset = 1;
        if (completionList.length > 0) {
            /* If the currently selected completion is still in the completion list,
             try to find it and jump to it. If not, select composer.
             */
            const currentSelection =
                this.state.selectionOffset <= 1
                    ? null
                    : this.state.completionList[this.state.selectionOffset - 1].completion;
            selectionOffset = completionList.findIndex((completion) => completion.completion === currentSelection);
            if (selectionOffset === -1) {
                selectionOffset = 1;
            } else {
                selectionOffset++; // selectionOffset is 1-indexed!
            }
        }

        let hide = true;
        // If `completion.command.command` is truthy, then a provider has matched with the query
        const anyMatches = completions.some((completion) => !!completion.command.command);
        if (anyMatches) {
            hide = false;
            if (this.props.onSelectionChange) {
                this.props.onSelectionChange(selectionOffset - 1);
            }
        }

        this.setState({
            completions,
            completionList,
            selectionOffset,
            hide,
            // Force complete is turned off each time since we can't edit the query in that case
            forceComplete: false,
        });
    }

    public hasSelection(): boolean {
        return this.countCompletions() > 0 && this.state.selectionOffset !== 0;
    }

    public countCompletions(): number {
        return this.state.completionList.length;
    }

    // called from MessageComposerInput
    public moveSelection(delta: number): void {
        const completionCount = this.countCompletions();
        if (completionCount === 0) return; // there are no items to move the selection through

        // Note: selectionOffset 0 represents the unsubstituted text, while 1 means first pill selected
        const index = (this.state.selectionOffset + delta + completionCount - 1) % completionCount;
        this.setSelection(1 + index);
    }

    public onEscape(e: KeyboardEvent): boolean | undefined {
        const completionCount = this.countCompletions();
        if (completionCount === 0) {
            // autocomplete is already empty, so don't preventDefault
            return;
        }

        e.preventDefault();

        // selectionOffset = 0, so we don't end up completing when autocomplete is hidden
        this.hide();
    }

    private hide = (): void => {
        this.setState({
            hide: true,
            selectionOffset: 1,
            completions: [],
            completionList: [],
        });
    };

    public forceComplete(): Promise<number> {
        return new Promise((resolve) => {
            this.setState(
                {
                    forceComplete: true,
                    hide: false,
                },
                () => {
                    this.complete(this.props.query, this.props.selection).then(() => {
                        resolve(this.countCompletions());
                    });
                },
            );
        });
    }

    public onConfirmCompletion = (): void => {
        this.onCompletionClicked(this.state.selectionOffset);
    };

    private onCompletionClicked = (selectionOffset: number): boolean => {
        const count = this.countCompletions();
        if (count === 0 || selectionOffset < 1 || selectionOffset > count) {
            return false;
        }

        this.props.onConfirm(this.state.completionList[selectionOffset - 1]);
        this.hide();

        return true;
    };

    private setSelection(selectionOffset: number): void {
        this.setState({ selectionOffset, hide: false });
        if (this.props.onSelectionChange) {
            this.props.onSelectionChange(selectionOffset - 1);
        }
    }

    public componentDidUpdate(prevProps: IProps): void {
        this.applyNewProps(this.state.displayMemberList, prevProps.query, prevProps.room);
        // this is the selected completion, so scroll it into view if needed
        const selectedCompletion = this.refs[`completion${this.state.selectionOffset}`] as HTMLElement;

        if (selectedCompletion) {
            selectedCompletion.scrollIntoView({
                behavior: "auto",
                block: "nearest",
            });
        } else if (this.containerRef.current) {
            this.containerRef.current.scrollTo({ top: 0 });
        }
    }

    public render(): React.ReactNode {
        let position = 1;
        const renderedCompletions = this.state.completions
            .map((completionResult, i) => {
                const completions = completionResult.completions.map((completion, j) => {
                    const selected = position === this.state.selectionOffset;
                    const className = classNames("mx_Autocomplete_Completion", { selected });
                    const componentPosition = position;
                    position++;

                    const onClick = (): void => {
                        this.onCompletionClicked(componentPosition);
                    };

                    return React.cloneElement(completion.component, {
                        key: j,
                        ref: `completion${componentPosition}`,
                        id: generateCompletionDomId(componentPosition - 1), // 0 index the completion IDs
                        className,
                        onClick,
                        "aria-selected": selected,
                    });
                });

                return completions.length > 0 ? (
                    <div key={i} className="mx_Autocomplete_ProviderSection" role="presentation">
                        {/*<div className="mx_Autocomplete_provider_name">{completionResult.provider.getName()}</div>*/}
                        {completionResult.provider.renderCompletions(completions)}
                    </div>
                ) : null;
            })
            .filter((completion) => !!completion);

        return !this.state.hide && renderedCompletions.length > 0 ? (
            <div id="mx_Autocomplete" className="mx_Autocomplete" ref={this.containerRef} role="listbox">
                {renderedCompletions}
            </div>
        ) : null;
    }
}
