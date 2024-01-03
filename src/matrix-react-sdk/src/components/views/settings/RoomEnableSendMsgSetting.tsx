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

import React, { useContext, memo } from "react";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Room } from "matrix-js-sdk/src/models/room";
import LabelledToggleSwitch from "matrix-react-sdk/src/components/views/elements/LabelledToggleSwitch";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { getPowerLevelByEnableDefaultUserSendMsg } from "matrix-react-sdk/src/powerLevel";
import { useRoomEnableSendMsg } from "matrix-react-sdk/src/hooks/room/useRoomEnableSendMsg";

interface IProps {
    room: Room;
    onError?(error: Error): void;
}

const RoomEnableSendMsgSetting: React.FC<IProps> = ({ room, onError }) => {
    const cli = useContext(MatrixClientContext);

    const { disabled, value, setValue } = useRoomEnableSendMsg(
        cli,
        room,
        (newContent) => {
            changeRoomPowerLevels(room, newContent.enable); // 修改配置后，同时修改powerLevel events_default一项，控制谁可以发送消息
        },
        onError,
    );

    const changeRoomPowerLevels = (room: Room, enable: boolean): Promise<ISendEventResponse> => {
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        const { events, users, ...statePowerLevels } = plEvent?.getContent() ?? {};
        const plContent = {
            ...statePowerLevels,
            ...getPowerLevelByEnableDefaultUserSendMsg(enable),
            events,
            users,
        };

        return cli.sendStateEvent(room.roomId, EventType.RoomPowerLevels, plContent);
    };

    const onToggleSendMsgEnable = (checked: boolean) => {
        setValue(checked);
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
export default memo(RoomEnableSendMsgSetting);
