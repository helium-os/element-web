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

import React, { useState, useEffect } from "react";
import { Room } from "matrix-js-sdk/src/models/room";

import { _t } from "../../../languageHandler";
import DialogButtons from "../elements/DialogButtons";
import BaseDialog from "../dialogs/BaseDialog";
import Field from "matrix-react-sdk/src/components/views/elements/Field";

interface IProps {
    space: Room;
    onFinished(isDelete: boolean): void;
}

const DeleteSpaceDialog: React.FC<IProps> = ({ space, onFinished }) => {
    const [name, setName] = useState<string>("");
    const [valid, setValid] = useState<boolean>(false);

    useEffect(() => {
        setValid(name.trim() === space.name.trim());
    }, [name, space]);

    const onChange = (e) => {
        setName(e.target.value);
    };
    const onDeleteRoom = () => {
        if (!valid) return;

        onFinished(true);
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Delete")}
            primaryButtonProps={{
                disabled: !valid,
                danger: true,
            }}
            onPrimaryButtonClick={() => onDeleteRoom()}
            hasCancel={true}
            onCancel={() => onFinished(false)}
        />
    );

    return (
        <BaseDialog
            title={_t("Delete Space")}
            className="mx_DeleteSpaceDialog"
            footer={footer}
            onFinished={() => onFinished(false)}
            fixedWidth={false}
        >
            <div className="mx_DeleteSpace_confirmName">
                你确定要删除<b>{space.name}</b>吗？此操作无法被撤销。
            </div>
            <Field
                type="text"
                label={_t("Room name", { roomType: _t("space") })}
                usePlaceholderAsHint={true}
                placeholder={"请输入社区名称"}
                autoFocus={false}
                onChange={onChange}
                value={name}
            />
        </BaseDialog>
    );
};

export default DeleteSpaceDialog;
