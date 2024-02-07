import React, { useState, useEffect, useMemo, memo, forwardRef, ForwardedRef } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import useRoomPermissions, { EventTypeMap } from "matrix-react-sdk/src/hooks/room/useRoomPermissions";
import { Room } from "matrix-js-sdk/src/models/room";

interface IProps {
    cli?: MatrixClient;
    room?: Room;
    roomId?: string;
}
interface EventTypePermissionMap {
    [propsKey: string]: EventTypeMap;
}

interface PermissionProps {
    [propsKey: string]: boolean;
}

export interface Opts {
    forwardRef: boolean;
}

// 多个eventType权限同步
export default function withRoomPermissions<P extends IProps>(
    Component: React.FC<P> | React.ComponentType<P>,
    mapEventPermissionToProps: EventTypePermissionMap,
    opts: Opts = {} as Opts,
) {
    const propsKeys: string[] = [];
    const eventTypes: EventTypeMap[] = [];
    for (const [key, value] of Object.entries(mapEventPermissionToProps)) {
        propsKeys.push(key);
        eventTypes.push(value);
    }
    const Proxy = (props: P, ref?: ForwardedRef<any>) => {
        const cli: MatrixClient = props.cli || MatrixClientPeg.get();

        const room = useMemo(() => props.room ?? cli.getRoom(props.roomId), [cli, props.room, props.roomId]);

        const permissions = useRoomPermissions(cli, room, eventTypes);

        const [permissionProps, setPermissionProps] = useState<PermissionProps>({});
        useEffect(() => {
            const permissionProps: PermissionProps = {};
            for (const [index, permission] of permissions.entries()) {
                const key = propsKeys[index];
                permissionProps[key] = permission;
            }

            setPermissionProps(permissionProps);
        }, [permissions]);

        const refProps = useMemo(() => (opts.forwardRef ? { ref } : {}), [ref]);

        return <Component {...props} {...permissionProps} {...refProps} room={room} />;
    };

    return memo(opts.forwardRef ? forwardRef(Proxy) : Proxy);
}
