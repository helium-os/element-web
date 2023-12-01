/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, { forwardRef, ReactNode, KeyboardEvent, Ref } from "react";
import classNames from "classnames";

import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import { _t } from "../../../languageHandler";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { backLabelForPhase } from "../../../stores/right-panel/RightPanelStorePhases";
import { CardContext } from "./context";

interface IProps {
    header?: ReactNode;
    title?: string;
    footer?: ReactNode;
    className?: string;
    withoutScrollContainer?: boolean;
    closeLabel?: string;
    onClose?(ev: ButtonEvent): void;
    onBack?(ev: ButtonEvent): void;
    onKeyDown?(ev: KeyboardEvent): void;
    cardState?: any;
    ref?: Ref<HTMLDivElement>;
    children: ReactNode;
}

interface IGroupProps {
    className?: string;
    title: string;
    children: ReactNode;
}

export const Group: React.FC<IGroupProps> = ({ className, title, children }) => {
    return (
        <div className={classNames("mx_BaseCard_Group", className)}>
            <h1>{title}</h1>
            {children}
        </div>
    );
};

const BaseCard: React.FC<IProps> = forwardRef<HTMLDivElement, IProps>(
    (
        { closeLabel, onClose, onBack, className, header, title, footer, withoutScrollContainer, children, onKeyDown },
        ref,
    ) => {
        let backButton;
        const cardHistory = RightPanelStore.instance.roomPhaseHistory;
        if (cardHistory.length > 1) {
            const prevCard = cardHistory[cardHistory.length - 2];
            const onBackClick = (ev: ButtonEvent): void => {
                onBack?.(ev);
                RightPanelStore.instance.popCard();
            };
            const label = backLabelForPhase(prevCard.phase) ?? _t("Back");
            backButton = <AccessibleButton className="mx_BaseCard_back" onClick={onBackClick} title={label} />;
        }

        let closeButton;
        if (onClose) {
            closeButton = <div className="mx_BaseCard_close" onClick={onClose} />;
        }

        if (!withoutScrollContainer) {
            children = <AutoHideScrollbar>{children}</AutoHideScrollbar>;
        }

        return (
            <CardContext.Provider value={{ isCard: true }}>
                <div className={classNames("mx_BaseCard", className)} ref={ref} onKeyDown={onKeyDown}>
                    {header || (
                        <div className="mx_BaseCard_header">
                            <span className="mx_BaseCard_header_title">{title}</span>
                            {closeButton}
                        </div>
                    )}
                    <div className="mx_BaseCard_content">
                        {backButton && <div className="mx_BaseCard_backBtn">{backButton}</div>}
                        {children}
                    </div>
                    {footer && <div className="mx_BaseCard_footer">{footer}</div>}
                </div>
            </CardContext.Provider>
        );
    },
);

export default BaseCard;
