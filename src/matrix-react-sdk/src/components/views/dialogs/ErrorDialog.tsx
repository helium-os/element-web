/*
Copyright 2015, 2016 OpenMarket Ltd

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

/*
 * Usage:
 * Modal.createDialog(ErrorDialog, {
 *   title: "some text", (default: "Error")
 *   description: "some more text",
 *   button: "Button Text",
 *   onFinished: someFunction,
 *   focus: true|false (default: true)
 * });
 */

import React from "react";

import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";

interface IProps {
    onFinished: (success?: boolean) => void;
    title?: string;
    description?: React.ReactNode;
    button?: string;
    focus?: boolean;
    headerImage?: string;
}

interface IState {
    onFinished: (success: boolean) => void;
}

export default class ErrorDialog extends React.Component<IProps, IState> {
    public static defaultProps: Partial<IProps> = {
        focus: true,
    };

    private onClick = (): void => {
        this.props.onFinished(true);
    };

    public render(): React.ReactNode {
        const footer = (
            <DialogButtons
                primaryButton={this.props.button || _t("OK")}
                onPrimaryButtonClick={this.onClick}
                hasCancel={false}
            />
        );
        return (
            <BaseDialog
                className="mx_ErrorDialog"
                onFinished={this.props.onFinished}
                title={this.props.title || _t("Error")}
                headerImage={this.props.headerImage}
                contentId="mx_Dialog_content"
                footer={footer}
            >
                {this.props.description || _t("An error has occurred.")}
            </BaseDialog>
        );
    }
}
