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

import React, { useState, useEffect } from "react";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import DecoratedRoomAvatar, {
    DecoratedRoomAvatarProps,
} from "matrix-react-sdk/src/components/views/avatars/DecoratedRoomAvatar";
import SpaceChannelAvatar from "matrix-react-sdk/src/components/views/avatars/SpaceChannelAvatar";

interface IProps extends DecoratedRoomAvatarProps {}

const RoomAndChannelAvatar: React.FC<IProps> = ({ room, ...DecoratedRoomAvatarProps }) => {
    const [isPrivate, setIsPrivate] = useState<boolean>(true);

    useEffect(() => {
        setIsPrivate(room.isPrivateRoom());
    }, [room]);

    return (
        <>
            {SpaceStore.instance.isHomeSpace ? (
                <DecoratedRoomAvatar room={room} {...DecoratedRoomAvatarProps} />
            ) : (
                <SpaceChannelAvatar isPrivate={isPrivate} />
            )}
        </>
    );
};

export default RoomAndChannelAvatar;
