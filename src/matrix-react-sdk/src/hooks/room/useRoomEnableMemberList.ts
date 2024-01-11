import { useEffect, useState } from "react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { IEnableMemberListContent } from "matrix-js-sdk/src/@types/partials";
import { Room } from "matrix-js-sdk/src/models/room";
import { useRoomState } from "matrix-react-sdk/src/hooks/room/useRoomState";
import { AdditionalEventType } from "../../../../vector/rewrite-js-sdk/event";

interface RoomStateResult {
    disabled: boolean;
    value: boolean;
    setValue: (value: boolean) => void;
}

// 获取"是否允许普通用户展示成员列表"该配置项的值
function getRoomEnableMemberList(content: IEnableMemberListContent): boolean {
    const { enable = true } = content ?? {};
    return enable;
}

export function useRoomEnableMemberList(
    cli: MatrixClient,
    room: Room,
    effectFn?: (newContent: IEnableMemberListContent) => Promise<void> | void,
    errorFn?: (error: Error) => void,
): RoomStateResult {
    const { disabled, content, setContent, sendStateEvent } = useRoomState<IEnableMemberListContent>(
        cli,
        room,
        AdditionalEventType.RoomEnableDefaultUserMemberList,
        async (newContent) => {
            await sendStateEvent(newContent); // 修改配置
            await effectFn?.(newContent);
        },
        errorFn,
    );

    const [value, setValue] = useState<boolean>(true);
    useEffect(() => {
        setValue(getRoomEnableMemberList(content));
    }, [content]);

    const onChange = (enable: boolean) => {
        const newContent: IEnableMemberListContent = {
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
