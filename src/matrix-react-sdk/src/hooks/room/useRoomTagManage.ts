import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";

export function useRoomTagManage(cli: MatrixClient, room: Room, userId): boolean {
    return useRoomEventPermission(cli, room, EventType.Tag, false, userId);
}
