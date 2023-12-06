import React, { memo, useState, useEffect } from "react";
import { EventType } from "matrix-js-sdk/src/matrix";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import RoomNameSettingsDialog from "matrix-react-sdk/src/components/views/dialogs/room_settings/RoomNameSettingsDialog";
import Modal from "matrix-react-sdk/src/Modal";
import RoomName from "matrix-react-sdk/src/components/views/elements/RoomName";
import { _t } from "matrix-react-sdk/src/languageHandler";

interface IProps {
    room: Room;
    title?: boolean | string;
}
const RoomNameSetting: React.FC<IProps> = ({ room, title = true }) => {
    const [canSetName, setCanSetName] = useState<boolean>(false);
    const [name, setName] = useState<string>("");

    useEffect(() => {
        const client = MatrixClientPeg.get();
        const userId = client.getSafeUserId();
        setCanSetName(room.currentState.maySendStateEvent(EventType.RoomName, userId) && !room.isAdminLeft());
    }, [room]);

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
                    <RoomName room={room}>
                        {(name) => {
                            setName(name);
                            return <>{name}</>;
                        }}
                    </RoomName>
                    {canSetName && <span className="mx_Settings_icon" />}
                </div>
            </div>
        </>
    );
};

export default memo(RoomNameSetting);
