import { useState, useEffect } from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEventType, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType } from "matrix-js-sdk/src/@types/event";

export interface EventTypeMap {
    eventType: IEventType;
    state: boolean;
}

// 是否有eventType对应事件类型的权限
export const hasEventTypePermission = (
    room: Room,
    eventType: IEventType,
    state: boolean, // true - state event    false - event
    userId: string,
    cli: MatrixClient,
): boolean => {
    return room?.currentState.hasEventTypePermission(eventType, userId, state, cli);
};

// 订阅用户对多个eventType对应的事件的权限变化
export default function useRoomPermissions(
    cli: MatrixClient,
    room: Room,
    eventTypes: EventTypeMap[],
    userId?: string,
): boolean[] {
    const [permissions, setPermissions] = useState<boolean[]>([]);

    useEffect(() => {
        if (!cli || !room || !eventTypes?.length) return;
        const resetPermissions = () => {
            const permissions: boolean[] = [];
            for (const item of eventTypes) {
                const permission = hasEventTypePermission(room, item.eventType, item.state, userId, cli);
                permissions.push(permission);
            }
            setPermissions(permissions);
        };

        const onRoomStateEvents = (ev: MatrixEvent) => {
            if (ev.getType() !== EventType.RoomPowerLevels) return;

            resetPermissions();
        };

        resetPermissions();

        room?.on(RoomStateEvent.Events, onRoomStateEvents); // 订阅room powerLevels更改
        room?.on(RoomEvent.MyMembership, resetPermissions); // 订阅user membership更改
        return () => {
            room?.off(RoomStateEvent.Events, onRoomStateEvents);
            room?.off(RoomEvent.MyMembership, resetPermissions);
        };
    }, [cli, room, eventTypes, userId]);

    return permissions;
}
