/*
Copyright 2017 Travis Ralston
Copyright 2019 New Vector Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import * as React from "react";
import classNames from "classnames";
import { logger } from "matrix-js-sdk/src/logger";

import BaseCard from "matrix-react-sdk/src/components/views/right_panel/BaseCard";
import AccessibleButton from "../views/elements/AccessibleButton";
import { PosthogScreenTracker, ScreenName } from "../../PosthogTrackers";
import { NonEmptyArray } from "../../@types/common";

/**
 * Represents a tab for the TabbedView.
 */
export class Tab {
    /**
     * Creates a new tab.
     * @param {string} id The tab's ID.
     * @param {string} label The untranslated tab label.
     * @param {string} icon The class for the tab icon. This should be a simple mask.
     * @param {React.ReactNode} body The JSX for the tab container.
     * @param {string} screenName The screen name to report to Posthog.
     */
    public constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly icon: string | null,
        public readonly body: React.ReactNode,
        public readonly screenName?: ScreenName,
    ) {}
}

export enum TabLocation {
    LEFT = "left",
    TOP = "top",
}

interface IProps {
    title?: string;
    tabs: NonEmptyArray<Tab>;
    footer?: React.ReactNode;
    initialTabId?: string;
    tabLocation: TabLocation;
    onChange?: (tabId: string) => void;
    screenName?: ScreenName;
    showIcon: boolean;
}

interface IState {
    activeTabId: string;
}

export default class TabbedView extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);

        const initialTabIdIsValid = props.tabs.find((tab) => tab.id === props.initialTabId);
        this.state = {
            activeTabId: initialTabIdIsValid ? props.initialTabId! : props.tabs[0].id,
        };
    }

    public static defaultProps = {
        tabLocation: TabLocation.LEFT,
        showIcon: false,
    };

    private getTabById(id: string): Tab | undefined {
        return this.props.tabs.find((tab) => tab.id === id);
    }

    /**
     * Shows the given tab
     * @param {Tab} tab the tab to show
     * @private
     */
    private setActiveTab(tab: Tab): void {
        // make sure this tab is still in available tabs
        if (this.getTabById(tab.id)) {
            if (this.props.onChange) this.props.onChange(tab.id);
            this.setState({ activeTabId: tab.id });
        } else {
            logger.error("Could not find tab " + tab.label + " in tabs");
        }
    }

    private renderTabLabel(tab: Tab): JSX.Element {
        let classes = "mx_TabbedView_tabLabel ";

        if (this.state.activeTabId === tab.id) classes += "mx_TabbedView_tabLabel_active";

        let tabIcon: JSX.Element | undefined;
        if (this.props.showIcon && tab.icon) {
            tabIcon = <span className={`mx_TabbedView_maskedIcon ${tab.icon}`} />;
        }

        const onClickHandler = (): void => this.setActiveTab(tab);

        return (
            <AccessibleButton
                className={classes}
                key={"tab_label_" + tab.label}
                onClick={onClickHandler}
                data-testid={`settings-tab-${tab.id}`}
            >
                {tabIcon}
                <span className="mx_TabbedView_tabLabel_text">{tab.label}</span>
            </AccessibleButton>
        );
    }

    private renderTabPanel(tab: Tab): React.ReactNode {
        return (
            <BaseCard className="mx_TabbedView_tabPanel" title={tab.label}>
                {tab.body}
            </BaseCard>
        );
    }

    public render(): React.ReactNode {
        const labels = this.props.tabs.map((tab) => this.renderTabLabel(tab));
        const tab = this.getTabById(this.state.activeTabId);
        const panel = tab ? this.renderTabPanel(tab) : null;

        const tabbedViewClasses = classNames({
            mx_TabbedView: true,
        });

        const screenName = tab?.screenName ?? this.props.screenName;

        return (
            <div className={tabbedViewClasses}>
                {screenName && <PosthogScreenTracker screenName={screenName} />}
                <div className="mx_TabbedView_leftPanel">
                    {this.props.title && (
                        <div className="mx_TabbedView_title" title={this.props.title}>
                            {this.props.title}
                        </div>
                    )}
                    <div className="mx_TabbedView_tabLabels">{labels}</div>
                    {this.props.footer}
                </div>
                {panel}
            </div>
        );
    }
}
