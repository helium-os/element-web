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

import React, { ChangeEvent, createRef } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { JoinRule, Preset, Visibility } from "matrix-js-sdk/src/@types/partials";

import SdkConfig from "../../../SdkConfig";
import withValidation, { IFieldState, IValidationResult } from "../elements/Validation";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { IOpts } from "../../../createRoom";
import Field from "../elements/Field";
import LabelledToggleSwitch from "../elements/LabelledToggleSwitch";
import DialogButtons from "../elements/DialogButtons";
import BaseDialog from "../dialogs/BaseDialog";
import { privateShouldBeEncrypted } from "../../../utils/rooms";
import { Tag } from "matrix-react-sdk/src/stores/room-list/models";

interface IProps {
    type?: RoomType;
    tags?: Tag[];
    defaultPublic?: boolean;
    defaultName?: string;
    parentSpace?: Room;
    defaultEncrypted?: boolean;
    onFinished(proceed?: false): void;
    onFinished(proceed: true, opts: IOpts): void;
}

interface IState {
    isPrivate: boolean;
    joinRule: JoinRule;
    isEncrypted: boolean;
    name: string;
    topic: string;
    alias: string;
    detailsOpen: boolean;
    noFederate: boolean;
    nameIsValid: boolean;
    canChangeEncryption: boolean;
    showChangeEncryption: boolean; // 是否展示更改"加密"设置区域
}

/**
 * 创建社区频道弹窗
 */
export default class CreateChannelDialog extends React.Component<IProps, IState> {
    private readonly supportsRestricted: boolean;
    private nameField = createRef<Field>();

    public constructor(props: IProps) {
        super(props);

        this.supportsRestricted = !!this.props.parentSpace;

        let joinRule = JoinRule.Invite;
        if (this.props.defaultPublic) {
            joinRule = JoinRule.Public;
        } else if (this.supportsRestricted) {
            joinRule = JoinRule.Restricted;
        }

        this.state = {
            isPrivate: false,
            isEncrypted: this.props.defaultEncrypted ?? privateShouldBeEncrypted(),
            joinRule,
            name: this.props.defaultName || "",
            topic: "",
            alias: "",
            detailsOpen: false,
            noFederate: SdkConfig.get().default_federate === false,
            nameIsValid: false,
            canChangeEncryption: true,
            showChangeEncryption: false,
        };

        MatrixClientPeg.get()
            .doesServerForceEncryptionForPreset(Preset.PrivateChat)
            .then((isForced) => this.setState({ canChangeEncryption: !isForced }));
    }

    private roomCreateOptions(): IOpts {
        const opts: IOpts = {};
        const createOpts: IOpts["createOpts"] = (opts.createOpts = {});
        opts.roomType = this.props.type;
        opts.tags = this.props.tags;
        createOpts.name = this.state.name;

        if (this.state.joinRule === JoinRule.Public) {
            createOpts.visibility = Visibility.Public;
            createOpts.preset = Preset.PublicChat;
            opts.guestAccess = false;
            const { alias } = this.state;
            createOpts.room_alias_name = alias.substring(1, alias.indexOf(":"));
        } else {
            // If we cannot change encryption we pass `true` for safety, the server should automatically do this for us.
            opts.encryption = this.state.canChangeEncryption ? this.state.isEncrypted : true;
        }

        if (this.state.topic) {
            createOpts.topic = this.state.topic;
        }
        if (this.state.noFederate) {
            createOpts.creation_content = { "m.federate": false };
        }

        opts.parentSpace = this.props.parentSpace;
        if (this.props.parentSpace && this.state.joinRule === JoinRule.Restricted) {
            opts.joinRule = JoinRule.Restricted;
        }

        return opts;
    }

    public componentDidMount(): void {
        this.setJoinRule();
    }

    public componentDidUpdate(prevProps: IProps, prevState: IState): void {
        if (this.state.isPrivate !== prevState.isPrivate) {
            this.setJoinRule();
        }
    }

    private setJoinRule() {
        this.setState({
            joinRule: this.state.isPrivate ? JoinRule.Invite : JoinRule.Restricted, // 社区内的公开频道对应的joinRule为"对社区成员可见"，原有的"公共频道"一项弃用
        });
    }

    private onOk = async (): Promise<void> => {
        if (!this.nameField.current) return;
        const activeElement = document.activeElement as HTMLElement;
        activeElement?.blur();
        await this.nameField.current.validate({ allowEmpty: false });

        await new Promise<void>((resolve) => this.setState({}, resolve));
        if (this.state.nameIsValid) {
            this.props.onFinished(true, this.roomCreateOptions());
        }
    };

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private onNameChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ name: ev.target.value });
    };

    private onTopicChange = (ev: React.ChangeEvent<HTMLTextAreaElement>): void => {
        this.setState({ topic: ev.target.value });
    };

    private onTogglePrivate = (isPrivate: boolean): void => {
        this.setState({ isPrivate });
    };

    private onNameValidate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const result = await CreateChannelDialog.validateRoomName(fieldState);
        this.setState({ nameIsValid: !!result.valid });
        return result;
    };

    private static validateRoomName = withValidation({
        rules: [
            {
                key: "required",
                test: async ({ value }) => !!value,
                invalid: () => _t("Please enter a name for the room"),
            },
        ],
    });

    public render(): React.ReactNode {
        const isVideoRoom = this.props.type === RoomType.ElementVideo;

        let title: string;
        if (isVideoRoom) {
            title = _t("Create a video room");
        } else if (this.props.parentSpace) {
            title = _t("Create a room", { type: _t("channel") });
        } else {
            title = this.state.joinRule === JoinRule.Public ? _t("Create a public room") : _t("Create a private room");
        }

        const footer = (
            <DialogButtons primaryButton={_t("Create")} onPrimaryButtonClick={this.onOk} onCancel={this.onCancel} />
        );

        return (
            <BaseDialog
                className="mx_CreateChannelDialog"
                onFinished={this.props.onFinished}
                title={title}
                screenName="CreateRoom"
                footer={footer}
            >
                <form>
                    <Field
                        type="text"
                        ref={this.nameField}
                        label={_t("Room name", { type: _t("Channel") })}
                        usePlaceholderAsHint={true}
                        placeholder={_t("Please enter a name for the room", { type: _t("channel") })}
                        autoFocus={false}
                        onChange={this.onNameChange}
                        onValidate={this.onNameValidate}
                        value={this.state.name}
                        className="mx_CreateRoomDialog_name"
                    />
                    <Field
                        type="text"
                        element="textarea"
                        label={_t("Description")}
                        usePlaceholderAsHint={true}
                        placeholder={"请输入一些描述"}
                        onChange={this.onTopicChange}
                        value={this.state.topic}
                        className="mx_CreateChannelDialog_topic"
                    />
                    <LabelledToggleSwitch
                        label={"建立私密频道，仅邀请可见"}
                        onChange={this.onTogglePrivate}
                        value={this.state.isPrivate}
                    />
                </form>
            </BaseDialog>
        );
    }
}
