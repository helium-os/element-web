import { useEffect, useState } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEnableSendMsgEventContent } from "matrix-js-sdk/src/@types/partials";
import { Room } from "matrix-js-sdk/src/models/room";
import { AdditionalEventType, useRoomState } from "matrix-react-sdk/src/hooks/room/useRoomState";

interface RoomStateResult {
    disabled: boolean;
    value: boolean;
    setValue: (value: boolean) => void;
}

// 获取"是否允许普通用户发送消息"该配置项的值
function getRoomEnableSendMsg(content: IEnableSendMsgEventContent): boolean {
    const { enable = true } = content ?? {};
    return enable;
}

export function useRoomEnableSendMsg(
    cli: MatrixClient,
    room: Room,
    effectFn?: (newContent: IEnableSendMsgEventContent) => Promise<void> | void,
    errorFn?: (error: Error) => void,
): RoomStateResult {
    const { disabled, content, setContent, sendStateEvent } = useRoomState<IEnableSendMsgEventContent>(
        cli,
        room,
        AdditionalEventType.RoomEnableDefaultUserSendMsg,
        async (newContent) => {
            await sendStateEvent(newContent); // 修改配置
            await effectFn?.(newContent);
        },
        errorFn,
    );

    const [value, setValue] = useState<boolean>(true);
    useEffect(() => {
        setValue(getRoomEnableSendMsg(content));
    }, [content]);

    const onChange = (enable: boolean) => {
        const newContent: IEnableSendMsgEventContent = {
            enable,
        };
        setContent(newContent);
    };

    return {
        disabled,
        value,
        setValue: onChange,
    };
}
