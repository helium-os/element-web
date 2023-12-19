/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { memo } from "react";
import BaseDialog, { DialogProps } from "./BaseDialog";

const RoomSettingsBaseDialog: React.FC<DialogProps> = ({ children, onFinished, ...restProps }) => {
    return (
        <BaseDialog
            className="mx_RoomSettingsBaseDialog"
            hasCancel={false}
            fixedWidth={false}
            onFinished={onFinished}
            {...restProps}
        >
            <div className="mx_RoomSettingsBaseDialog_wrap">
                <div className="mx_RoomSettingsBaseDialog_backPanel" onClick={onFinished}>
                    <div className="mx_RoomSettingsBaseDialog_backIcon" />
                </div>
                <div className="mx_RoomSettingsBaseDialog_content">{children}</div>
            </div>
        </BaseDialog>
    );
};

export default memo(RoomSettingsBaseDialog);
