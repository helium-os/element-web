/*
Copyright 2017 Aidan Gauland
Copyright 2018 New Vector Ltd.
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
import Button, { ButtonProps, ButtonType } from "matrix-react-sdk/src/components/views/button/Button";

import { _t } from "../../../languageHandler";

export interface DialogButtonProps {
    primaryButton: React.ReactNode;
    primaryButtonProps?: Omit<ButtonProps, "children" | "onClick">;
    onPrimaryButtonClick?: (ev: React.MouseEvent) => void | Promise<void>;

    // If true, make the primary button a form submit button (input type="submit")
    primaryIsSubmit?: boolean;

    // should there be a cancel button? default: true
    hasCancel?: boolean;
    // A node to insert into the cancel button instead of default "Cancel"
    cancelButton?: React.ReactNode;
    cancelButtonProps?: Omit<ButtonProps, "children" | "onClick">;
    // onClick handler for the cancel button.
    onCancel?: (...args: any[]) => void;

    focus?: boolean;

    // disables the primary and cancel buttons
    disabled?: boolean;

    // something to stick next to the buttons, optionally
    additive?: ReactNode;

    children?: ReactNode;
}

/**
 * Basic container for buttons in modal dialogs.
 */
export default class DialogButtons extends React.Component<DialogButtonProps> {
    public static defaultProps: Partial<DialogButtonProps> = {
        hasCancel: true,
        disabled: false,
    };

    private onCancelClick = (event: React.MouseEvent): void => {
        this.props.onCancel?.(event);
    };

    public render(): React.ReactNode {
        let cancelButton: JSX.Element | undefined;
        if (this.props.hasCancel) {
            cancelButton = (
                <Button
                    type={ButtonType.Default}
                    disabled={this.props.disabled || this.props.cancelButtonProps?.disabled}
                    onClick={this.onCancelClick}
                    {...this.props.cancelButtonProps}
                >
                    {this.props.cancelButton || _t("Cancel")}
                </Button>
            );
        }

        let additive: JSX.Element | undefined;
        if (this.props.additive) {
            additive = <div className="mx_Dialog_buttons_additive">{this.props.additive}</div>;
        }

        return (
            <div className="mx_Dialog_buttons">
                {additive}
                <span className="mx_Dialog_buttons_row">
                    {cancelButton}
                    {this.props.children}
                    <Button
                        type={ButtonType.Primary}
                        disabled={this.props.disabled || this.props.primaryButtonProps?.disabled}
                        onClick={this.props.onPrimaryButtonClick}
                        {...this.props.primaryButtonProps}
                    >
                        {this.props.primaryButton}
                    </Button>
                </span>
            </div>
        );
    }
}
