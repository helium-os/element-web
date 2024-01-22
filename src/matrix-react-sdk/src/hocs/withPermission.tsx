import React from "react";
import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { Room } from "matrix-js-sdk/src/models/room";
import { IEventType } from "matrix-js-sdk/src/models/room-state";

export interface IBaseProps {
    cli?: MatrixClient;
    room: Room;
}

// 单个eventType权限同步
export default function withPermission<T extends IBaseProps>(
    Component: React.FC<T> | React.ComponentType<T>,
    eventType: IEventType,
    propsKey: string,
): React.FC<T> {
    const Proxy: React.FC<T> = (props) => {
        const cli: MatrixClient = props.cli || MatrixClientPeg.get();

        const hasPermission = useRoomEventPermission(cli, props.room, eventType);

        return <Component {...props} {...{ [propsKey]: hasPermission }} />;
    };

    return Proxy;
}
