import { useEffect, useState } from "react";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { RoomState, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { Room } from "matrix-js-sdk/src/models/room";

/**
 * 判断是否是社区内频道
 * @param roomId
 */
export default function useIsSpaceChannel(roomId): [boolean, Room[]] {
    const [parents, setParents] = useState<Room[]>([]);

    const onRoomState = (state: RoomState) => {
        setChannelParents(roomId);
    };

    const setChannelParents = (roomId) => {
        const parents = SpaceStore.instance.getParents(roomId);
        setParents(parents);
    };

    useEffect(() => {
        if (!roomId) return;
        setChannelParents(roomId);
        MatrixClientPeg.get().on(RoomStateEvent.Update, onRoomState);
        return () => {
            MatrixClientPeg.get().off(RoomStateEvent.Update, onRoomState);
        };
    }, [roomId]);

    return [parents.length > 0, parents];
}