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

import React, { useState, memo } from "react";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";

import createRoom from "../../../createRoom";
import CreateRoomDialog from "./CreateRoomDialog";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { OwnProfileStore } from "matrix-react-sdk/src/stores/OwnProfileStore";

interface IProps {
    room: Room;
    type?: RoomType;
    onFinished(): void;
}

/**
 * 从私聊界面邀请成员并创建群聊弹窗（基于私聊创建群聊）
 */
const CreateRoomBaseChatDialog: React.FC<IProps> = ({ room, type, onFinished }) => {
    const [busy, setBusy] = useState<boolean>(false);
    const onCreate = async ({ avatar, name, invite }) => {
        if (busy) return;

        setBusy(true);

        const inviteUsers = [
            ...room.getMembers().filter((item) => item.userId !== MatrixClientPeg.get().getUserId()), // 邀请用户里需要过滤掉当前用户（当前用户创建了群聊）
            ...invite,
        ];

        if (!name) {
            name = [...inviteUsers.map((item) => item.name), OwnProfileStore.instance.displayName].join("、");
        }

        const inviteUserIds = inviteUsers.map((item) => item.userId);

        try {
            await createRoom({
                roomType: type,
                joinRule: JoinRule.Invite,
                avatar,
                createOpts: {
                    name,
                    invite: inviteUserIds,
                },
            });
            onFinished();
        } catch (error) {
        } finally {
            setBusy(false);
        }
    };

    return <CreateRoomDialog nameRequired={false} inviteRequired={true} onCreate={onCreate} onFinished={onFinished} />;
};

export default memo(CreateRoomBaseChatDialog);
