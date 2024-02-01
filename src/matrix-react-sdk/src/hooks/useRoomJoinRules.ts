import { MatrixClient } from "matrix-js-sdk/src/client";
import { IJoinRuleEventContent } from "matrix-js-sdk/src/@types/partials";
import { Room } from "matrix-js-sdk/src/models/room";
import { useRoomEvent } from "matrix-react-sdk/src/hooks/room/useRoomEvent";
import { EventType } from "matrix-js-sdk/src/@types/event";

interface RoomStateResult {
    hasPermission: boolean;
    content: IJoinRuleEventContent;
    setContent: (newContent: IJoinRuleEventContent) => void;
}

export function useRoomJoinRules(
    cli: MatrixClient,
    room: Room,
    effectFn?: (newContent: IJoinRuleEventContent) => Promise<void> | void, // 调用setValue修改配置成功后的回调
    errorFn?: (error: Error) => void,
): RoomStateResult {
    const { hasPermission, content, setContent, sendStateEvent } = useRoomEvent<IJoinRuleEventContent>(
        cli,
        room,
        EventType.RoomJoinRules,
        false,
        async (newContent) => {
            await sendStateEvent(newContent); // 修改配置
            await effectFn?.(newContent);
        },
        errorFn,
    );

    return {
        hasPermission,
        content,
        setContent,
    };
}
