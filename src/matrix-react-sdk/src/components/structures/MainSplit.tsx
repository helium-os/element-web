/*
Copyright 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode } from "react";
import { NumberSize, Resizable } from "re-resizable";
import { Direction } from "re-resizable/lib/resizer";

import ResizeNotifier from "../../utils/ResizeNotifier";
import RightPanelStore from "matrix-react-sdk/src/stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "matrix-react-sdk/src/stores/right-panel/RightPanelStorePhases";
import { UPDATE_EVENT } from "matrix-react-sdk/src/stores/AsyncStore";
import { isInApp } from "matrix-react-sdk/src/utils/env";

interface IProps {
    resizeNotifier: ResizeNotifier;
    collapsedRhs?: boolean;
    panel?: JSX.Element;
    children: ReactNode;
}

interface IState {
    phase: RightPanelPhases | null;
    rightPanelResizeable: boolean;
    rightPanelDefaultWidth: number | string;
}
export default class MainSplit extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            phase: null,
            rightPanelResizeable: false,
            rightPanelDefaultWidth: 0,
        };
    }

    componentDidMount() {
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelUpdate);
    }

    componentWillUnmount() {
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelUpdate);
    }

    private onRightPanelUpdate = () => {
        const { phase } = RightPanelStore.instance.currentCard || {};
        const rightPanelResizeable = [RightPanelPhases.ThreadPanel, RightPanelPhases.ThreadView].includes(phase);
        this.setState({
            phase,
            rightPanelResizeable,
            rightPanelDefaultWidth: rightPanelResizeable ? "30%" : 244,
        });
    };

    private onResizeStart = (): void => {
        this.props.resizeNotifier.startResizing();
    };

    private onResize = (): void => {
        this.props.resizeNotifier.notifyRightHandleResized();
    };

    private onResizeStop = (
        event: MouseEvent | TouchEvent,
        direction: Direction,
        elementRef: HTMLElement,
        delta: NumberSize,
    ): void => {
        this.props.resizeNotifier.stopResizing();
        window.localStorage.setItem("mx_rhs_size", (this.loadSidePanelSize().width + delta.width).toString());
    };

    private loadSidePanelSize(): { height: string | number; width: string | number } {
        let rhsSize = parseInt(window.localStorage.getItem("mx_rhs_size")!, 10);

        if (isNaN(rhsSize)) {
            rhsSize = this.state.rightPanelDefaultWidth;
        }
        return {
            height: "100%",
            width: rhsSize,
        };
    }

    public render(): React.ReactNode {
        const bodyView = React.Children.only(this.props.children);
        const panelView = this.props.panel;

        const hasResizer = !this.props.collapsedRhs && panelView;

        const getChildren = () => {
            if (isInApp) {
                return (
                    <div className={`mx_PanelView_dialog ${hasResizer ? "mx_PanelView_show" : "mx_PanelView_hidden"}`}>
                        <div className="mx_PanelView_wrap">{panelView}</div>
                    </div>
                );
            }
            return hasResizer ? (
                <Resizable
                    defaultSize={this.loadSidePanelSize()}
                    minWidth={this.state.rightPanelDefaultWidth}
                    maxWidth={this.state.rightPanelResizeable ? "70%" : this.state.rightPanelDefaultWidth}
                    enable={
                        this.state.rightPanelResizeable
                            ? {
                                  top: false,
                                  right: false,
                                  bottom: false,
                                  left: true,
                                  topRight: false,
                                  bottomRight: false,
                                  bottomLeft: false,
                                  topLeft: false,
                              }
                            : false
                    }
                    onResizeStart={this.onResizeStart}
                    onResize={this.onResize}
                    onResizeStop={this.onResizeStop}
                    className="mx_ResizeWrapper mx_RightPanel_ResizeWrapper"
                    handleClasses={{ left: "mx_ResizeHandle_horizontal" }}
                >
                    {panelView}
                </Resizable>
            ) : null;
        };

        return (
            <>
                <div className={`mx_MainSplit ${this.state.rightPanelResizeable ? "mx_RightPanel_resizeable" : ""}`}>
                    {bodyView}
                    {!isInApp && getChildren()}
                </div>
                {isInApp && getChildren()}
            </>
        );
    }
}
