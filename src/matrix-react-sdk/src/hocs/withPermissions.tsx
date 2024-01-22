import React from "react";
import withPermission, { IBaseProps } from "matrix-react-sdk/src/hocs/withPermission";
import { IEventType } from "matrix-js-sdk/src/models/room-state";

interface IProps extends IBaseProps {}
interface EventTypePermissionMap {
    [propsKey: string]: IEventType;
}

interface EventTypePermissionItem {
    eventType: IEventType;
    propsKey: string;
}

// 多个eventType权限同步
export default function withPermissions<T extends IProps>(
    Component: React.FC<T> | React.ComponentType<T>,
    mapEventPermissionToProps: EventTypePermissionMap,
): React.FC<T> {
    const permissionMapArr: EventTypePermissionItem[] = [];
    for (const [key, value] of Object.entries(mapEventPermissionToProps)) {
        permissionMapArr.push({
            eventType: value,
            propsKey: key,
        });
    }
    const Proxy: React.FC<T> = (props) => {
        const NewComponent = permissionMapArr.reduce(
            (Component, { propsKey, eventType }) => withPermission<T>(Component, eventType, propsKey),
            Component,
        );

        return <NewComponent {...props} />;
    };

    return Proxy;
}
