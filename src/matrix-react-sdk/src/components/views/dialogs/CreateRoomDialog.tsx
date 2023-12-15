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

import React, { useState, useRef, memo, ChangeEvent } from "react";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";

import { _t } from "../../../languageHandler";
import { IOpts } from "../../../createRoom";
import Field from "../elements/Field";
import DialogButtons from "../elements/DialogButtons";
import BaseDialog from "../dialogs/BaseDialog";
import { InviteInput, InviteInputProps } from "matrix-react-sdk/src/components/views/dialogs/invite/InviteDialog";
import { InviteKind } from "matrix-react-sdk/src/components/views/dialogs/invite/InviteDialogTypes";
import { Member } from "matrix-react-sdk/src/utils/direct-messages";
import AvatarSetting from "matrix-react-sdk/src/components/views/settings/AvatarSetting";
import withValidation, {
    IFieldState,
    IValidationResult,
} from "matrix-react-sdk/src/components/views/elements/Validation";

interface CreateOpts {
    avatar: File;
    name: string;
    invite: Member[];
}

interface IProps {
    type?: RoomType;
    nameRequired?: boolean; // 群聊名字是否是必须的
    inviteRequired?: boolean; // 邀请用户是否是必须的
    inviteInputProps?: Partial<InviteInputProps>;
    defaultName?: string;
    onCreate?: (opts: CreateOpts) => Promise<void> | void;
    onFinished(proceed?: false): void;
    onFinished(proceed: true, opts: IOpts): void;
}

const validateRoomName = withValidation({
    rules: [
        {
            key: "required",
            test: async ({ value }) => !!value,
            invalid: () => _t("Please enter a name for the room", { roomType: _t("room") }),
        },
    ],
});

/**
 * 创建群聊弹窗
 *
 * 场景一：点击群聊+创建新的群聊  该场景群聊名称必填，但是邀请的用户不是必填项
 * 场景二：从私聊里点击邀请用户发起群聊 该场景群聊名称不是必填项，但是邀请的用户是必填项
 */
const CreateRoomDialog: React.FC<IProps> = ({
    type,
    defaultName = "",
    nameRequired = true,
    inviteRequired = false,
    inviteInputProps,
    onCreate,
    onFinished,
}) => {
    const nameField = useRef(null);
    const [name, setName] = useState<string>(defaultName);
    const [nameIsValid, setNameIsValid] = useState<boolean>(false); // 群聊名称是否校验通过
    const [avatar, setAvatar] = useState<File>();

    const [invite, setInvite] = useState<Member[]>([]);

    const onNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setName(ev.target.value);
    };

    const onOk = () => {
        if (onCreate) {
            onCreate({
                avatar,
                name,
                invite,
            });
            return;
        }

        onFinished(true, {
            roomType: type,
            joinRule: JoinRule.Invite,
            avatar,
            createOpts: {
                name,
                invite: invite.map((item) => item.userId),
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
            primaryButton={_t("Create room", { roomType: _t("room") })}
            primaryButtonProps={{
                disabled: (nameRequired && !nameIsValid) || (inviteRequired && !invite.length),
            }}
            onPrimaryButtonClick={onOk}
            onCancel={onCancel}
        />
    );

    return (
        <BaseDialog
            className="mx_CreateRoomDialog"
            onFinished={onFinished}
            title={_t("Create a room", { roomType: _t("room") })}
            screenName="CreateRoom"
            footer={footer}
        >
            <form>
                <AvatarSetting avatarDisabled={false} setAvatar={setAvatar} />
                <div style={{ marginTop: "20px" }}>
                    <Field
                        type="text"
                        ref={nameField}
                        label={_t("Room name", { roomType: _t("roomShort") })}
                        usePlaceholderAsHint={true}
                        placeholder={_t("Please enter a name for the room", { roomType: _t("roomShort") })}
                        autoFocus={false}
                        onChange={onNameChange}
                        value={name}
                        wordLimit={80}
                        className="mx_CreateRoomDialog_name"
                        validateOnFocus={false}
                        {...(nameRequired ? { onValidate: onNameValidate } : {})}
                    />
                </div>
                <div style={{ marginTop: "20px" }}>
                    <InviteInput
                        kind={InviteKind.Invite}
                        onTargetsChange={setInvite}
                        inputFieldProps={{ placeholder: "添加1人或多人" }}
                        {...inviteInputProps}
                    />
                </div>
            </form>
        </BaseDialog>
    );
};

export default memo(CreateRoomDialog);
