import React, { memo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import BaseCard from "matrix-react-sdk/src/components/views/right_panel/BaseCard";
import RoomNameSettings from "matrix-react-sdk/src/components/views/room_settings/RoomNameSetting";
import RoomAvatarSettings from "matrix-react-sdk/src/components/views/room_settings/RoomAvatarSetting";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { RoomPermalinkCreator } from "matrix-react-sdk/src/utils/permalinks/Permalinks";
import Button, { ButtonSize } from "matrix-react-sdk/src/components/views/button/Button";
import dis from "matrix-react-sdk/src/dispatcher/dispatcher";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

interface IProps {
    room: Room;
    onClose: () => void;
    permalinkCreator: RoomPermalinkCreator;
}
const RoomSettingsPanel: React.FC<IProps> = ({ room, onClose }) => {
    const client = MatrixClientPeg.get();
    const myUserId = client.getSafeUserId();
    const myMember = room.getMember(myUserId);
    const onLeave = () => {
        dis.dispatch({
            action: "leave_room",
            room_id: room.roomId,
        });
    };

    return (
        <>
            <BaseCard
                title={_t("Room Settings", {
                    roomType: room.getRoomTypeLabel(),
                })}
                className="mx_RoomSettingsPanel"
                onClose={onClose}
                withoutScrollContainer={true}
            >
                <div className="mx_RoomSettings_overview">
                    <RoomAvatarSettings room={room} size={36} autoUpload={true} />
                    <RoomNameSettings room={room} title={false} />
                </div>
                <div className="mx_RoomSettings_buttons">
                    <Button size={ButtonSize.Small} block danger onClick={onLeave}>
                        {_t("Leave room", {
                            actionType: myMember.isAdmin() ? _t("Disband") : _t("Quit"),
                            roomType: room.getRoomTypeLabel(),
                        })}
                    </Button>
                </div>
            </BaseCard>
        </>
    );
};

export default memo(RoomSettingsPanel);
