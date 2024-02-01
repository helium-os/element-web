import { useMemo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEventType } from "matrix-js-sdk/src/models/room-state";
import useRoomPermissions from "matrix-react-sdk/src/hooks/room/useRoomPermissions";

// 订阅用户对eventType对应的事件的权限变化
export default function useRoomEventPermission(
    cli: MatrixClient,
    room: Room,
    eventType: IEventType,
    state: boolean,
    userId?: string,
): boolean {
    const [hasPermission] = useRoomPermissions(
        cli,
        room,
        useMemo(
            () => [
                {
                    eventType,
                    state,
                },
            ],
            [eventType, state],
        ),
        userId,
    );

    return hasPermission;
}
