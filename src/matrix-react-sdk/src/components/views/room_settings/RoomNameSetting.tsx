import React, { memo, useState, useEffect } from "react";
import { EventType } from "matrix-js-sdk/src/matrix";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import RoomNameSettingsDialog from "matrix-react-sdk/src/components/views/dialogs/room_settings/RoomNameSettingsDialog";
import Modal from "matrix-react-sdk/src/Modal";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";

interface IProps {
    room: Room;
    title?: boolean | string;
}

function getRoomName(room) {
    const topicEvent = room.currentState.getStateEvents(EventType.RoomName, "");
    return topicEvent?.getContent()["name"] ?? "";
}

const RoomNameSetting: React.FC<IProps> = ({ room, title = true }) => {
    const client = MatrixClientPeg.get();

    const canSetName: boolean = useRoomEventPermission(client, room, EventType.RoomName, false, client.getSafeUserId()); // 是否有修改名称的权限
    const [name, setName] = useState<string>("");

    useEffect(() => {
        if (!room?.roomId) {
            setName("");
            return;
        }
        const onRoomStateEvents = (ev: MatrixEvent): void => {
            if (ev.getRoomId() !== room?.roomId || ev.getType() !== EventType.RoomName) return;

            setName(getRoomName(room));
        };

        setName(getRoomName(room));
        client?.on(RoomStateEvent.Events, onRoomStateEvents);

        return () => {
            client?.removeListener(RoomStateEvent.Events, onRoomStateEvents);
        };
    }, [client, room]);

    const onEditName = () => {
        if (!canSetName) return;

        Modal.createDialog(RoomNameSettingsDialog, {
            roomId: room.roomId,
            roomName: name,
            canSetName,
        });
    };

    return (
        <>
            <div className={`mx_TextSettingsItem mx_RoomName_Settings ${!canSetName ? "mx_Settings_disabled" : ""}`}>
                {title && (
                    <div className="mx_TextSettingsItem_title">
                        {typeof title === "string"
                            ? title
                            : room.isSpaceRoom()
                              ? _t("Space Name")
                              : _t("Room name", {
                                    roomType: room.getRoomTypeLabel(),
                                })}
                    </div>
                )}
                <div className="mx_TextSettingsItem_info" onClick={onEditName}>
                    {name}
                    {canSetName && <span className="mx_Settings_icon" />}
                </div>
            </div>
        </>
    );
};

export default memo(RoomNameSetting);
