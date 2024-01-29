import React, { useState, useEffect, memo } from "react";
import { IEventType } from "matrix-js-sdk/src/models/room-state";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import useRoomPermissions from "matrix-react-sdk/src/hooks/room/useRoomPermissions";
import { Room } from "matrix-js-sdk/src/models/room";

interface IProps {
    cli?: MatrixClient;
    room: Room;
}
interface EventTypePermissionMap {
    [propsKey: string]: IEventType;
}

interface PermissionProps {
    [propsKey: string]: boolean;
}

// 多个eventType权限同步
export default function withRoomPermissions<T extends IProps>(
    Component: React.FC<T> | React.ComponentType<T>,
    mapEventPermissionToProps: EventTypePermissionMap,
): React.FC<T> {
    const propsKeys = [];
    const eventTypes = [];
    for (const [key, value] of Object.entries(mapEventPermissionToProps)) {
        propsKeys.push(key);
        eventTypes.push(value);
    }
    const Proxy: React.FC<T> = (props) => {
        const cli: MatrixClient = props.cli || MatrixClientPeg.get();

        const [permissionProps, setPermissionProps] = useState<PermissionProps>({});

        const permissions = useRoomPermissions(cli, props.room, eventTypes);

        useEffect(() => {
            const permissionProps: PermissionProps = {};
            for (const [index, permission] of permissions.entries()) {
                const key = propsKeys[index];
                permissionProps[key] = permission;
            }

            setPermissionProps(permissionProps);
        }, [permissions]);
        return <Component {...props} {...permissionProps} />;
    };

    return memo(Proxy);
}
