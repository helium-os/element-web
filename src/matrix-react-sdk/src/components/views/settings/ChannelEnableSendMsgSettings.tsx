/*
Copyright 2019 New Vector Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { useContext, useState, useEffect, memo } from "react";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Room } from "matrix-js-sdk/src/models/room";
import LabelledToggleSwitch from "matrix-react-sdk/src/components/views/elements/LabelledToggleSwitch";
import { IEnableDefaultUserSendMsgEventContent } from "matrix-js-sdk/src/@types/partials";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { getEventsDefaultByEnableDefaultUserSendMsg } from "matrix-react-sdk/src/powerLevel";
import { AdditionalEventType, useRoomState } from "matrix-react-sdk/src/hooks/room/useRoomState";

interface IProps {
    room: Room;
    onError?(error: Error): void;
}

// 获取"是否允许普通用户发送消息"该配置项的值
function getRoomEnableDefaultUserSendMsg(content: IEnableDefaultUserSendMsgEventContent): boolean {
    const { enable: enableDefaultUserSendMsg = true } = content ?? {};
    return enableDefaultUserSendMsg;
}

const ChannelEnableSendMsgSettings: React.FC<IProps> = ({ room, onError }) => {
    const cli = useContext(MatrixClientContext);

    const { disabled, content, setContent, sendStateEvent } = useRoomState<IEnableDefaultUserSendMsgEventContent>(
        cli,
        room,
        AdditionalEventType.RoomEnableDefaultUserSendMsg,
        async (newContent) => {
            await sendStateEvent(newContent); // 修改配置项
            await changeRoomPowerLevels(room, newContent.enable); // 修改配置后，同时修改powerLevel events_default一项，控制谁可以发送消息
        },
        onError,
    );

    const [value, setValue] = useState<boolean>(true);
    useEffect(() => {
        setValue(getRoomEnableDefaultUserSendMsg(content));
    }, [content]);

    const changeRoomPowerLevels = (room: Room, enable: boolean): Promise<ISendEventResponse> => {
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        const { events, users, ...statePowerLevels } = plEvent?.getContent() ?? {};
        const plContent = {
            ...statePowerLevels,
            events_default: getEventsDefaultByEnableDefaultUserSendMsg(enable),
            events,
            users,
        };

        return cli.sendStateEvent(room.roomId, EventType.RoomPowerLevels, plContent);
    };

    const onToggleSendMsgEnable = (checked: boolean) => {
        const newContent: IEnableDefaultUserSendMsgEventContent = {
            enable: checked,
        };
        setContent(newContent);
    };

    return (
        <>
            <LabelledToggleSwitch
                label={"允许普通用户发送消息"}
                disabled={disabled}
                value={value}
                onChange={onToggleSendMsgEnable}
            />
        </>
    );
};
export default memo(ChannelEnableSendMsgSettings);
