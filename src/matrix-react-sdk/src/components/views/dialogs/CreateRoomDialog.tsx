/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

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

import React, { useState, useEffect, useRef, memo, ChangeEvent } from "react";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";

import { _t } from "../../../languageHandler";
import { IOpts } from "../../../createRoom";
import Field from "../elements/Field";
import DialogButtons from "../elements/DialogButtons";
import BaseDialog from "../dialogs/BaseDialog";
import { InviteInput } from "matrix-react-sdk/src/components/views/dialogs/invite/InviteDialog";
import { InviteKind } from "matrix-react-sdk/src/components/views/dialogs/invite/InviteDialogTypes";
import { Member } from "matrix-react-sdk/src/utils/direct-messages";
import AvatarSetting from "matrix-react-sdk/src/components/views/settings/AvatarSetting";
import withValidation, {
    IFieldState,
    IValidationResult,
} from "matrix-react-sdk/src/components/views/elements/Validation";

interface IProps {
    type?: RoomType;
    defaultName?: string;
    onFinished(proceed?: false): void;
    onFinished(proceed: true, opts: IOpts): void;
}

const validateRoomName = withValidation({
    rules: [
        {
            key: "required",
            test: async ({ value }) => !!value,
            invalid: () => _t("Please enter a name for the room", { type: _t("room") }),
        },
    ],
});

/**
 * 创建群聊弹窗
 */
const CreateRoomDialog: React.FC<IProps> = ({ type, onFinished }) => {
    const nameField = useRef(null);
    const [name, setName] = useState<string>("");
    const [nameIsValid, setNameIsValid] = useState<boolean>(false); // 群聊名称是否校验通过
    const [avatar, setAvatar] = useState<File>();

    const [targets, setTargets] = useState<Member[]>([]);
    const [invite, setInvite] = useState<string[]>([]);

    useEffect(() => {
        setInvite(targets.map((item) => item.userId));
    }, [targets]);

    const onNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setName(ev.target.value);
    };

    const onOk = () => {
        onFinished(true, {
            roomType: type,
            joinRule: JoinRule.Invite,
            avatar,
            createOpts: {
                name,
                invite,
            },
        });
    };

    const onCancel = () => {
        onFinished?.(false);
    };

    const onNameValidate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const result = await validateRoomName({
            ...fieldState,
            allowEmpty: false,
        });
        setNameIsValid(result.valid);
        return result;
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Create")}
            primaryDisabled={!nameIsValid}
            onPrimaryButtonClick={onOk}
            onCancel={onCancel}
        />
    );

    return (
        <BaseDialog
            className="mx_CreateRoomDialog"
            onFinished={onFinished}
            title={_t("Create a room", { type: _t("room") })}
            screenName="CreateRoom"
            footer={footer}
        >
            <form>
                <AvatarSetting avatarDisabled={false} setAvatar={setAvatar} />
                <div style={{ marginTop: "20px" }}>
                    <Field
                        type="text"
                        ref={nameField}
                        label={_t("Room name", { type: _t("Room") })}
                        usePlaceholderAsHint={true}
                        placeholder={_t("Please enter a name for the room", { type: _t("room") })}
                        autoFocus={true}
                        onChange={onNameChange}
                        value={name}
                        wordLimit={80}
                        className="mx_CreateRoomDialog_name"
                        validateOnFocus={false}
                        onValidate={onNameValidate}
                    />
                </div>
                <div style={{ marginTop: "20px" }}>
                    <InviteInput
                        kind={InviteKind.Invite}
                        onTargetsChange={setTargets}
                        inputFieldProps={{ placeholder: "添加1人或多人" }}
                    />
                </div>
            </form>
        </BaseDialog>
    );
};

export default memo(CreateRoomDialog);
