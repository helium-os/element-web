/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { useState, useEffect, useMemo, memo } from "react";
import { IJoinRuleEventContent, JoinRule, RestrictedAllowType } from "matrix-js-sdk/src/@types/partials";
import { Room } from "matrix-js-sdk/src/models/room";
import { EventType } from "matrix-js-sdk/src/@types/event";

import StyledRadioGroup, { IDefinition } from "../elements/StyledRadioGroup";
import { _t } from "../../../languageHandler";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { doesRoomVersionSupport, PreferredRoomVersions } from "../../../utils/PreferredRoomVersions";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import {
    getDefaultEventPowerLevels,
    getDefaultStatePowerLevels,
    getInitStatePowerLevels,
} from "matrix-react-sdk/src/powerLevel";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { useRoomEnableMemberList } from "matrix-react-sdk/src/hooks/room/useRoomEnableMemberList";
import { useRoomEnableSendMsg } from "matrix-react-sdk/src/hooks/room/useRoomEnableSendMsg";
import { useRoomJoinRules } from "matrix-react-sdk/src/hooks/useRoomJoinRules";

interface IProps {
    room: Room;
    onError?(error: Error): void;
    beforeChange?(joinRule: JoinRule): Promise<boolean>; // if returns false then aborts the change
}

const SpaceAndChannelJoinRuleSettings: React.FC<IProps> = ({ room, onError, beforeChange }) => {
    const roomSupportsRestricted = doesRoomVersionSupport(room.getVersion(), PreferredRoomVersions.RestrictedRooms);

    const [cli, setCli] = useState<MatrixClient | null>(null);
    const [isSpaceRoom, setIsSpaceRoom] = useState<boolean>(false);
    useEffect(() => {
        setCli(room?.client);
        setIsSpaceRoom(room?.isSpaceRoom());
    }, [room]);

    const { hasPermission, content, setContent } = useRoomJoinRules(
        cli,
        room,
        async (newContent: IJoinRuleEventContent) => {
            await changeRoomPowerLevels(room, newContent.join_rule); // 修改room可见性后，同时修改room权限
            console.log("room.currentState.getPowerLevels()", room.currentState.getPowerLevels());
        },
        onError,
    );

    const { value: enableDefaultUserMemberList } = useRoomEnableMemberList(cli, room); // 是否允许普通用户展示成员列表
    const { value: enableDefaultUserSendMsg } = useRoomEnableSendMsg(cli, room); // 是否允许普通用户发送消息

    const joinRule = useMemo(() => content.join_rule ?? JoinRule.Invite, [content]);
    const restrictedAllowRoomIds = useMemo(
        () =>
            joinRule === JoinRule.Restricted
                ? content.allow?.filter((o) => o.type === RestrictedAllowType.RoomMembership).map((o) => o.room_id)
                : undefined,
        [joinRule, content],
    );

    const definitions: IDefinition<JoinRule>[] = useMemo(
        () => [
            ...(room.isSpaceRoom()
                ? [
                      {
                          value: JoinRule.Public, // 用于公开社区
                          label: _t("Public"),
                          description: "允许普通用户邀请其他用户加入到当前社区",
                      },
                  ]
                : [
                      {
                          value: JoinRule.Restricted, // 用于社区内公开频道（对社区内成员可见）
                          label: _t("Public"),
                          description: "社区内所有用户可访问当前频道",
                          // if there are 0 allowed spaces then render it as invite only instead
                          checked: joinRule === JoinRule.Restricted && !!restrictedAllowRoomIds?.length,
                      },
                  ]),
            {
                value: JoinRule.Invite, // 用于私密社区 || 私密频道
                label: _t("Private"),
                description: room.isSpaceRoom()
                    ? "仅管理员和协管员可邀请用户到当前社区"
                    : "仅社区管理员和协管员可邀请用户到当前频道",
            },
        ],
        [room, joinRule, restrictedAllowRoomIds],
    );

    const changeRoomPowerLevels = (room: Room, joinRule: JoinRule): Promise<ISendEventResponse> => {
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        const { events, users, ...statePowerLevels } = plEvent?.getContent() ?? {};
        const plContent = {
            ...statePowerLevels,
            ...getDefaultStatePowerLevels(isSpaceRoom, joinRule),
            ...getInitStatePowerLevels({
                isSpace: isSpaceRoom,
                enableDefaultUserSendMsg,
                enableDefaultUserMemberList,
            }),
            events: {
                ...events,
                ...getDefaultEventPowerLevels(isSpaceRoom),
            },
        };

        return cli.sendStateEvent(room.roomId, EventType.RoomPowerLevels, plContent);
    };

    const onChange = async (newJoinRule: JoinRule): Promise<void> => {
        const beforeJoinRule = joinRule;

        let restrictedAllowRoomIds: string[] | undefined;
        if (newJoinRule === JoinRule.Restricted) {
            // 社区内频道才允许设置对社区内成员可见（公开频道）
            if (!room.isSpaceRoom() && (beforeJoinRule === JoinRule.Restricted || roomSupportsRestricted)) {
                restrictedAllowRoomIds = [SpaceStore.instance.activeSpaceRoom.roomId];
            }

            if (!restrictedAllowRoomIds?.length) {
                newJoinRule = JoinRule.Invite;
            }
        }

        if (beforeJoinRule === newJoinRule && !restrictedAllowRoomIds) return;
        if (beforeChange && !(await beforeChange(newJoinRule))) return;

        const newContent: IJoinRuleEventContent = {
            join_rule: newJoinRule,
        };

        // pre-set the accepted spaces with the currently viewed one as per the microcopy
        if (newJoinRule === JoinRule.Restricted) {
            newContent.allow = restrictedAllowRoomIds?.map((roomId) => ({
                type: RestrictedAllowType.RoomMembership,
                room_id: roomId,
            }));
        }

        setContent(newContent);
    };

    return (
        <StyledRadioGroup
            name="joinRule"
            value={joinRule}
            onChange={onChange}
            definitions={definitions}
            disabled={!hasPermission}
            className="mx_JoinRuleSettings_radioButton"
        />
    );
};

export default memo(SpaceAndChannelJoinRuleSettings);
