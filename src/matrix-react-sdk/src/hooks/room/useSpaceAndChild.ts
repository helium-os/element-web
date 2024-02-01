import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";

export function useSpaceAndChild(cli: MatrixClient, spaceRoom: Room, userId): boolean {
    return useRoomEventPermission(cli, spaceRoom, EventType.SpaceChild, false, userId);
}
