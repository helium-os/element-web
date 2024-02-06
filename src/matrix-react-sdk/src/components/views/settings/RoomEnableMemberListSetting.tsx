import React, { useContext, memo } from "react";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Room } from "matrix-js-sdk/src/models/room";
import LabelledToggleSwitch from "matrix-react-sdk/src/components/views/elements/LabelledToggleSwitch";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { IEnableMemberListContent } from "matrix-js-sdk/src/@types/partials";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { getPowerLevelByEnableDefaultUserMemberList } from "matrix-react-sdk/src/powerLevel";
import { useRoomEnableMemberList } from "matrix-react-sdk/src/hooks/room/useRoomEnableMemberList";

interface IProps {
    room: Room;
    onError?(error: Error): void;
}

const RoomEnableMemberListSetting: React.FC<IProps> = ({ room, onError }) => {
    const cli = useContext(MatrixClientContext);

    const { hasPermission, value, setValue } = useRoomEnableMemberList(
        cli,
        room,
        (newContent: IEnableMemberListContent) => {
            changeRoomPowerLevels(room, newContent.enable); // 修改配置后，同时修改powerLevel display_member_list一项，控制谁可以展示成员列表
        },
        onError,
    );

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
        setValue(checked);
    };

    return (
        <>
            <LabelledToggleSwitch
                label={"是否显示成员列表"}
                disabled={!hasPermission}
                value={value}
                onChange={onToggleMemberListEnable}
            />
        </>
    );
};
export default memo(RoomEnableMemberListSetting);
