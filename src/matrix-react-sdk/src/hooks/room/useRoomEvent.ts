import { useEffect, useState, useCallback } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { AdditionalEventType } from "../../../../vector/rewrite-js-sdk/event";
import useRoomEventPermission from "matrix-react-sdk/src/hooks/room/useRoomEventPermission";

interface RoomStateResult<T> {
    hasPermission: boolean;
    content: T | null;
    setContent: (newContent: T) => Promise<unknown>;
    sendStateEvent: (newContent: T, stateKey?: string) => Promise<ISendEventResponse>;
}

// 获取eventType对应配置项的内容
export function getRoomEventContent<T>(room: Room, eventType: EventType | AdditionalEventType): T | null {
    const event = room?.currentState.getStateEvents(eventType, "");
    return event?.getContent() ?? null;
}

export function useRoomEvent<T>(
    cli: MatrixClient,
    room: Room,
    eventType: EventType | AdditionalEventType,
    state: boolean, // true-state event  false-event
    setterFn?: (newContent: T) => Promise<void>,
    errorFn?: (error: Error) => void,
): RoomStateResult<T> {
    const hasPermission = useRoomEventPermission(cli, room, eventType, state); // 判断是否有操作权限

    const [content, setContent] = useState<T | null>({} as T); // eventType对应配置项内容

    // 订阅eventType对应配置项内容的更改
    useEffect(() => {
        const onRoomStateEvents = (ev: MatrixEvent): void => {
            if (ev.getRoomId() !== room?.roomId || ev.getType() !== eventType) return;

            setContent(getRoomEventContent(room, eventType));
        };

        setContent(getRoomEventContent(room, eventType));

        room.currentState?.on(RoomStateEvent.Events, onRoomStateEvents);
        return () => {
            room.currentState?.removeListener(RoomStateEvent.Events, onRoomStateEvents);
        };
    }, [room, eventType]);

    const onContentChange = async (newContent: T) => {
        setContent(newContent);
        try {
            await setterFn?.(newContent);
        } catch (error) {
            setContent(getRoomEventContent(room, eventType));
            errorFn?.(error);
        }
    };

    // 修改配置项
    const sendStateEvent = useCallback(
        (newContent: T, stateKey = "") => cli.sendStateEvent(room.roomId, eventType, newContent, stateKey),
        [cli, room.roomId, eventType],
    );

    return {
        hasPermission,
        content,
        setContent: onContentChange,
        sendStateEvent,
    };
}
