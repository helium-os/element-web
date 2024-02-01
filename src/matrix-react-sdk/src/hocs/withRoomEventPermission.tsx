import React, { memo, useMemo } from "react";
import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { Room } from "matrix-js-sdk/src/models/room";
import { IEventType } from "matrix-js-sdk/src/models/room-state";

export interface IBaseProps {
    cli?: MatrixClient;
    room?: Room;
    roomId?: string;
}

// 单个eventType权限同步
export default function withRoomEventPermission<T extends IBaseProps>(
    Component: React.FC<T> | React.ComponentType<T>,
    eventType: IEventType,
    state: boolean,
    propsKey: string,
): React.FC<T> {
    const Proxy: React.FC<T> = (props) => {
        const cli: MatrixClient = props.cli || MatrixClientPeg.get();

        const room = useMemo(() => props.room ?? cli.getRoom(props.roomId), [cli, props.room, props.roomId]);
        const hasPermission = useRoomEventPermission(cli, props.room, eventType, state);

        return <Component {...props} room={room} {...{ [propsKey]: hasPermission }} />;
    };

    return memo(Proxy);
}
