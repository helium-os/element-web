import { useEffect, useState, useCallback } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { useTypedEventEmitter } from "../useEventEmitter";
import { RoomMemberEvent } from "matrix-js-sdk/src/models/room-member";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";

export enum AdditionalEventType {
    // Room state events
    RoomEnableDefaultUserSendMsg = "m.room.enable_default_user_send_message", // 是否允许普通用户发送消息
    RoomEnableDefaultUserMemberList = "m.room.enable_default_user_member_list", // 是否允许普通用户展示成员列表
}

interface RoomStateResult<T> {
    disabled: boolean;
    content: T | null;
    setContent: (newContent: T) => Promise<unknown>;
    sendStateEvent: (newContent: T, stateKey?: string) => Promise<ISendEventResponse>;
}

// 是否有权限修改eventType对应的配置项
const hasPermission = (room: Room, eventType: EventType | AdditionalEventType, cli: MatrixClient): boolean => {
    return cli && room?.currentState.mayClientSendStateEvent(eventType, cli);
};

// 获取eventType对应配置项的内容
export function getRoomStateContent<T>(room: Room, eventType: EventType | AdditionalEventType): T | null {
    const event = room?.currentState.getStateEvents(eventType, "");
    return event?.getContent() ?? null;
}

export function useRoomState<T>(
    cli: MatrixClient,
    room: Room,
    eventType: EventType | AdditionalEventType,
    setterFn?: (newContent: T) => Promise<void>,
    errorFn?: (error: Error) => void,
): RoomStateResult<T> {
    // 判断权限
    const [disabled, setDisabled] = useState(() => !hasPermission(room, eventType, cli));
    useEffect(() => {
        setDisabled(!hasPermission(room, eventType, cli));
    }, [room, eventType, cli]);
    useTypedEventEmitter(cli, RoomMemberEvent.PowerLevel, (ev: MatrixEvent) => {
        setDisabled(!hasPermission(room, eventType, cli));
    });

    // eventType对应配置项内容
    const [content, setContent] = useState<T | null>(() => getRoomStateContent<T>(room, eventType));
    useEffect(() => {
        setContent(getRoomStateContent(room, eventType));
    }, [room, eventType]);
    useTypedEventEmitter(room.currentState, RoomStateEvent.Events, (ev: MatrixEvent) => {
        if (ev.getType() !== eventType) return;
        setContent(getRoomStateContent(room, eventType));
    });

    // 修改配置项
    const sendStateEvent = useCallback(
        (newContent: T, stateKey = "") => cli.sendStateEvent(room.roomId, eventType, newContent, stateKey),
        [cli, room, eventType],
    );

    const onContentChange = async (newContent: T) => {
        setContent(newContent);
        try {
            await setterFn?.(newContent);
        } catch (error) {
            setContent(getRoomStateContent(room, eventType));
            errorFn?.(error);
        }
    };

    return {
        disabled,
        content,
        setContent: onContentChange,
        sendStateEvent,
    };
}
