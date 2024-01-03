import React, { useContext, useState, useEffect, memo } from "react";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Room } from "matrix-js-sdk/src/models/room";
import LabelledToggleSwitch from "matrix-react-sdk/src/components/views/elements/LabelledToggleSwitch";
import { IEnableDefaultUserMemberListContent } from "matrix-js-sdk/src/@types/partials";
import { AdditionalEventType, useRoomState } from "matrix-react-sdk/src/hooks/room/useRoomState";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { getPowerLevelByEnableDefaultUserMemberList } from "matrix-react-sdk/src/powerLevel";

interface IProps {
    room: Room;
    onError?(error: Error): void;
}

// 获取"是否允许普通用户展示成员列表"该配置项的值
function getRoomEnableDefaultUserMemberList(content: IEnableDefaultUserMemberListContent): boolean {
    const { enable = true } = content ?? {};
    return enable;
}

const ChannelEnableMemberListSettings: React.FC<IProps> = ({ room, onError }) => {
    const cli = useContext(MatrixClientContext);

    const { disabled, content, setContent, sendStateEvent } = useRoomState<IEnableDefaultUserMemberListContent>(
        cli,
        room,
        AdditionalEventType.RoomEnableDefaultUserMemberList,
        async (newContent) => {
            await sendStateEvent(newContent); // 修改配置项
            await changeRoomPowerLevels(room, newContent.enable); // 修改配置后，同时修改powerLevel display_member_list一项，控制谁可以展示成员列表
        },
        onError,
    );

    const [value, setValue] = useState<boolean>(true);
    useEffect(() => {
        setValue(getRoomEnableDefaultUserMemberList(content));
    }, [content]);

    const changeRoomPowerLevels = (room: Room, enable: boolean): Promise<ISendEventResponse> => {
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        const { events, users, ...statePowerLevels } = plEvent?.getContent() ?? {};
        const plContent = {
            ...statePowerLevels,
            ...getPowerLevelByEnableDefaultUserMemberList(enable),
            events,
            users,
        };

        return cli.sendStateEvent(room.roomId, EventType.RoomPowerLevels, plContent);
    };

    const onToggleMemberListEnable = (checked: boolean) => {
        const newContent: IEnableDefaultUserMemberListContent = {
            enable: checked,
        };
        setContent(newContent);
    };

    return (
        <>
            <LabelledToggleSwitch
                label={"是否显示成员列表"}
                disabled={disabled}
                value={value}
                onChange={onToggleMemberListEnable}
            />
        </>
    );
};
export default memo(ChannelEnableMemberListSettings);
