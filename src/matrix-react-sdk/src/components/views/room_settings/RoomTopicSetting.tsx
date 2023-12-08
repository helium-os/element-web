import React, { memo, useState, useEffect } from "react";
import { EventType } from "matrix-js-sdk/src/matrix";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import RoomTopicSettingsDialog from "matrix-react-sdk/src/components/views/dialogs/room_settings/RoomTopicSettingsDialog";
import Modal from "matrix-react-sdk/src/Modal";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";

interface IProps {
    room: Room;
    title?: boolean | string;
}

function getRoomTopic(room) {
    const topicEvent = room.currentState.getStateEvents(EventType.RoomTopic, "");
    return topicEvent?.getContent()["topic"] ?? "";
}
const RoomTopicSetting: React.FC<IProps> = ({ room, title = true }) => {
    const client = MatrixClientPeg.get();

    const [canSetTopic, setCanSetTopic] = useState<boolean>(false);
    const [topic, setTopic] = useState<string>("");

    // 判断是否有修改topic的权限
    useEffect(() => {
        const userId = client.getSafeUserId();
        setCanSetTopic(room.currentState.maySendStateEvent(EventType.RoomTopic, userId) && !room.isAdminLeft());
    }, [client, room]);

    useEffect(() => {
        if (!room?.roomId) {
            setTopic("");
            return;
        }

        const onRoomStateEvents = (ev: MatrixEvent): void => {
            if (ev.getRoomId() !== room?.roomId || ev.getType() !== EventType.RoomTopic) return;

            setTopic(getRoomTopic(room));
        };

        setTopic(getRoomTopic(room));
        client?.on(RoomStateEvent.Events, onRoomStateEvents);

        return () => {
            client?.removeListener(RoomStateEvent.Events, onRoomStateEvents);
        };
    }, [client, room]);

    const onEditTopic = () => {
        if (!canSetTopic) return;

        Modal.createDialog(RoomTopicSettingsDialog, {
            roomId: room.roomId,
            topic,
            canSetTopic,
        });
    };

    return (
        <>
            <div className={`mx_TextSettingsItem mx_RoomTopic_Settings ${!canSetTopic ? "mx_Settings_disabled" : ""}`}>
                {title && (
                    <div className="mx_TextSettingsItem_title">
                        {typeof title === "string" ? title : _t("Description")}
                    </div>
                )}
                <div className="mx_TextSettingsItem_info" onClick={onEditTopic}>
                    {topic || <span className="mx_TextSettingsItem_info_default">添加描述</span>}
                    {canSetTopic && <span className="mx_Settings_icon" />}
                </div>
            </div>
        </>
    );
};

export default memo(RoomTopicSetting);
