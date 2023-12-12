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

interface IProps {
    resizeNotifier: ResizeNotifier;
    collapsedRhs?: boolean;
    panel?: JSX.Element;
    children: ReactNode;
}

interface IState {
    phase: RightPanelPhases | null;
}
export default class MainSplit extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);
        this.state = {
            phase: null,
        };
    }

    componentDidMount() {
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelUpdate);
    }

    componentWillUnmount() {
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelUpdate);
    }

    private onRightPanelUpdate = () => {
        this.setState({
            phase: RightPanelStore.instance.currentCard?.phase,
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

    private loadSidePanelSize(): { height: string | number; width: number } {
        let rhsSize = parseInt(window.localStorage.getItem("mx_rhs_size")!, 10);

        if (isNaN(rhsSize)) {
            rhsSize = 350;
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

        const isThreadPanel = [RightPanelPhases.ThreadPanel, RightPanelPhases.ThreadView].includes(this.state.phase);

        let children;
        if (hasResizer) {
            children = (
                <Resizable
                    defaultSize={this.loadSidePanelSize()}
                    minWidth={isThreadPanel ? 364 : 244}
                    maxWidth={isThreadPanel ? "50%" : 244}
                    enable={
                        isThreadPanel
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
                    className={`mx_RightPanel_ResizeWrapper ${isThreadPanel ? "mx_ThreadPanel_ResizeWrapper" : ""}`}
                    handleClasses={{ left: "mx_ResizeHandle_horizontal" }}
                >
                    {panelView}
                </Resizable>
            );
        }

        return (
            <div className="mx_MainSplit">
                {bodyView}
                {children}
            </div>
        );
    }
}
