/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { FC, useContext, useState, useEffect } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { useDispatcher } from "../../../hooks/useDispatcher";
import RoomPreviewBar from "matrix-react-sdk/src/components/views/rooms/RoomPreviewBar";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

interface IProps {
    room: Room;
    onJoinButtonClicked: () => void;
    onRejectButtonClicked: () => void;
}

// XXX This component is currently only used for spaces and video rooms, though
// surely we should expand its use to all rooms for consistency? This already
// handles the text room case, though we would need to add support for ignoring
// and viewing invite reasons to achieve parity with the default invite screen.
const RoomPreviewCard: FC<IProps> = ({ room, onJoinButtonClicked, onRejectButtonClicked }) => {
    const cli = useContext(MatrixClientContext);

    const [inviter, setInviter] = useState<RoomMember | null>(null);

    const [joining, setJoining] = useState<boolean>(false);
    const [rejecting, setRejecting] = useState<boolean>(false);
    const [busy, setBusy] = useState(false);

    useDispatcher(defaultDispatcher, (payload) => {
        if (payload.action === Action.JoinRoomError && payload.roomId === room.roomId) {
            setBusy(false); // stop the spinner, join failed
        }
    });

    useEffect(() => {
        const inviteSender = room.getMember(cli.getUserId()!)?.events.member?.getSender();

        setInviter(room.getMember(inviteSender));
    }, [room, cli]);

    const onJoinClick = () => {
        setBusy(true);
        setJoining(true);
        onJoinButtonClicked();
    };

    const onRejectClick = () => {
        setBusy(true);
        setRejecting(true);
        onRejectButtonClicked();
    };

    return (
        <div className="mx_RoomPreviewCard">
            <RoomPreviewBar
                onJoinClick={onJoinClick}
                onRejectClick={onRejectClick}
                inviterName={inviter ? inviter.name : ""}
                canPreview={false}
                joining={joining}
                rejecting={rejecting}
                loading={busy}
                room={room}
                roomId={room.roomId}
            />
        </div>
    );
};

export default RoomPreviewCard;
