import { useState, useEffect } from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEventType, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { RoomMemberEvent } from "matrix-js-sdk/src/models/room-member";

// 是否有eventType对应事件类型的权限
const hasEventTypePermission = (room: Room, stateEventType: IEventType, userId: string, cli: MatrixClient): boolean => {
    return room?.currentState.hasEventTypePermission(stateEventType, userId, true, cli);
};

// 订阅用户对eventType对应的事件的权限变化
export default function useRoomEventPermission(
    cli: MatrixClient,
    room: Room,
    stateEventType: IEventType,
    userId?: string,
) {
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        if (!room || !stateEventType) return;
        const resetHasPermission = () => {
            setHasPermission(hasEventTypePermission(room, stateEventType, userId, cli));
        };

        const onRoomStateEvents = (ev: MatrixEvent) => {
            if (ev.getType() !== EventType.RoomPowerLevels) return;

            resetHasPermission();
        };

        resetHasPermission();
        room?.on(RoomStateEvent.Events, onRoomStateEvents); // 订阅room powerLevels更改
        cli.on(RoomMemberEvent.PowerLevel, resetHasPermission); // 订阅user powerLevels更改
        room?.on(RoomEvent.MyMembership, resetHasPermission); // 订阅user membership更改
        return () => {
            room?.off(RoomStateEvent.Events, onRoomStateEvents);
            cli.off(RoomMemberEvent.PowerLevel, resetHasPermission);
            room?.off(RoomEvent.MyMembership, resetHasPermission);
        };
    }, [cli, room, stateEventType, userId]);

    return hasPermission;
}
