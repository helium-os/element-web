/*
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

import React, { memo, useEffect, useState } from "react";

import AvatarSetting, { AvatarProps, OperateType } from "matrix-react-sdk/src/components/views/settings/AvatarSetting";
import { EventType } from "matrix-js-sdk/src/matrix";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { getHttpUrlFromMxc } from "matrix-react-sdk/src/customisations/Media";

export interface AvatarEditProps extends Partial<AvatarProps> {
    autoUpload?: boolean; // 是否是自动上传  true-自动上传  false-手动上传
    room: Room;
}

function getRoomAvatarUrl(room, size) {
    const avatarEvent = room.currentState.getStateEvents(EventType.RoomAvatar, "");
    let avatarUrl = avatarEvent?.getContent()["url"] ?? null;
    if (avatarUrl) avatarUrl = getHttpUrlFromMxc(avatarUrl, size);
    return avatarUrl;
}

const RoomAvatarSetting: React.FC<AvatarEditProps> = ({ autoUpload = true, room, size, setAvatar, ...restProps }) => {
    const client = MatrixClientPeg.get();
    const [canSetAvatar, setCanSetAvatar] = useState<boolean>(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!room?.roomId) {
            setAvatarUrl(null);
            return;
        }
        const onRoomStateEvents = (ev: MatrixEvent): void => {
            if (ev.getRoomId() !== room?.roomId || ev.getType() !== EventType.RoomAvatar) return;

            setAvatarUrl(getRoomAvatarUrl(room, size));
        };

        setAvatarUrl(getRoomAvatarUrl(room, size));
        client?.on(RoomStateEvent.Events, onRoomStateEvents);

        return () => {
            client?.removeListener(RoomStateEvent.Events, onRoomStateEvents);
        };
    }, [client, room, size]);

    // 判断是否有修改头像的权限
    useEffect(() => {
        const client = MatrixClientPeg.get();
        const userId = client.getSafeUserId();
        setCanSetAvatar(room.currentState.maySendStateEvent(EventType.RoomAvatar, userId) && !room.isAdminLeft());
    }, [room]);

    const onSaveProfile = async (file: File | null) => {
        if (!canSetAvatar || !file) return;

        const { content_uri: uri } = await client.uploadContent(file);
        await client.sendStateEvent(room.roomId, EventType.RoomAvatar, { url: uri }, "");
    };

    return (
        <AvatarSetting
            type={OperateType.Edit}
            avatarUrl={avatarUrl}
            size={size}
            avatarDisabled={!canSetAvatar}
            setAvatar={autoUpload ? onSaveProfile : setAvatar}
            {...restProps}
        />
    );
};

export default memo(RoomAvatarSetting);
