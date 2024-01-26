import { useState, useEffect } from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEventType, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { RoomMemberEvent } from "matrix-js-sdk/src/models/room-member";

// 是否有eventType对应事件类型的权限
export const hasEventTypePermission = (
    room: Room,
    eventType: IEventType,
    userId: string,
    cli: MatrixClient,
): boolean => {
    return room?.currentState.hasEventTypePermission(eventType, userId, true, cli);
};

// 订阅用户对多个eventType对应的事件的权限变化
export default function useRoomPermissions(
    cli: MatrixClient,
    room: Room,
    eventTypes: IEventType[],
    userId?: string,
): boolean[] {
    const [permissions, setPermissions] = useState<boolean[]>([]);

    useEffect(() => {
        if (!cli || !room || !eventTypes?.length) return;
        const resetPermissions = () => {
            const permissions: boolean[] = [];
            for (const eventType of eventTypes) {
                permissions.push(hasEventTypePermission(room, eventType, userId, cli));
            }
            setPermissions(permissions);
        };

        const onRoomStateEvents = (ev: MatrixEvent) => {
            if (ev.getType() !== EventType.RoomPowerLevels) return;

            resetPermissions();
        };

        resetPermissions();
        room?.on(RoomStateEvent.Events, onRoomStateEvents); // 订阅room powerLevels更改
        cli.on(RoomMemberEvent.PowerLevel, resetPermissions); // 订阅user powerLevels更改
        room?.on(RoomEvent.MyMembership, resetPermissions); // 订阅user membership更改
        return () => {
            room?.off(RoomStateEvent.Events, onRoomStateEvents);
            cli.off(RoomMemberEvent.PowerLevel, resetPermissions);
            room?.off(RoomEvent.MyMembership, resetPermissions);
        };
    }, [cli, room, eventTypes, userId]);

    return permissions;
}
