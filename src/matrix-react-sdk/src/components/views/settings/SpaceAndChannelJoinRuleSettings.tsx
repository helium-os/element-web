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

import React, { memo } from "react";
import { IJoinRuleEventContent, JoinRule, RestrictedAllowType } from "matrix-js-sdk/src/@types/partials";
import { Room } from "matrix-js-sdk/src/models/room";
import { EventType, RoomType } from "matrix-js-sdk/src/@types/event";

import StyledRadioGroup, { IDefinition } from "../elements/StyledRadioGroup";
import { _t } from "../../../languageHandler";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { useLocalEcho } from "../../../hooks/useLocalEcho";
import { doesRoomVersionSupport, PreferredRoomVersions } from "../../../utils/PreferredRoomVersions";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { getDefaultEventPowerLevels, getDefaultPowerLevels } from "matrix-react-sdk/src/powerLevel";

interface IProps {
    room: Room;
    onError?(error: Error): void;
    beforeChange?(joinRule: JoinRule): Promise<boolean>; // if returns false then aborts the change
}

const SpaceAndChannelJoinRuleSettings: React.FC<IProps> = ({ room, onError, beforeChange }) => {
    const cli = room.client;

    const roomSupportsRestricted = doesRoomVersionSupport(room.getVersion(), PreferredRoomVersions.RestrictedRooms);

    const disabled = !room.currentState.mayClientSendStateEvent(EventType.RoomJoinRules, cli) || room.isAdminLeft();

    const [content, setContent] = useLocalEcho<IJoinRuleEventContent>(
        () => room.currentState.getStateEvents(EventType.RoomJoinRules, "")?.getContent(),
        async (content) => {
            await cli.sendStateEvent(room.roomId, EventType.RoomJoinRules, content, "");
            // 修改room可见性后，同时修改room权限
            await changeRoomPowerLevel(room, content.join_rule);
        },
        onError,
    );

    const { join_rule: joinRule = JoinRule.Invite } = content || {};
    const restrictedAllowRoomIds =
        joinRule === JoinRule.Restricted
            ? content.allow?.filter((o) => o.type === RestrictedAllowType.RoomMembership).map((o) => o.room_id)
            : undefined;

    const definitions: IDefinition<JoinRule>[] = [
        ...(room.isSpaceRoom()
            ? [
                  {
                      value: JoinRule.Public, // 用于公开社区
                      label: _t("Public"),
                  },
              ]
            : [
                  {
                      value: JoinRule.Restricted, // 用于社区内公开频道（对社区内成员可见）
                      label: _t("Public"),
                      // if there are 0 allowed spaces then render it as invite only instead
                      checked: joinRule === JoinRule.Restricted && !!restrictedAllowRoomIds?.length,
                  },
              ]),
        {
            value: JoinRule.Invite, // 用于私密社区 || 私密频道
            label: _t("Private"),
        },
    ];

    const changeRoomPowerLevel = (room, joinRule): Promise<ISendEventResponse> => {
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        let roomType;
        if (room.isSpaceRoom()) {
            roomType = RoomType.Space;
        }

        const { events, users, ...restPowerLevels } = plEvent?.getContent() ?? {};
        const plContent = {
            ...restPowerLevels,
            ...getDefaultPowerLevels(roomType, joinRule),
            events: {
                ...events,
                ...getDefaultEventPowerLevels(roomType),
            },
            users,
        };

        return cli.sendStateEvent(room.roomId, EventType.RoomPowerLevels, plContent);
    };

    const onChange = async (joinRule: JoinRule): Promise<void> => {
        const beforeJoinRule = content.join_rule;

        let restrictedAllowRoomIds: string[] | undefined;
        if (joinRule === JoinRule.Restricted) {
            // 社区内频道才允许设置对社区内成员可见（公开频道）
            if (!room.isSpaceRoom() && (beforeJoinRule === JoinRule.Restricted || roomSupportsRestricted)) {
                restrictedAllowRoomIds = [SpaceStore.instance.activeSpaceRoom.roomId];
            }

            if (!restrictedAllowRoomIds?.length) {
                joinRule = JoinRule.Invite;
            }
        }

        if (beforeJoinRule === joinRule && !restrictedAllowRoomIds) return;
        if (beforeChange && !(await beforeChange(joinRule))) return;

        const newContent: IJoinRuleEventContent = {
            join_rule: joinRule,
        };

        // pre-set the accepted spaces with the currently viewed one as per the microcopy
        if (joinRule === JoinRule.Restricted) {
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
            disabled={disabled}
            className="mx_JoinRuleSettings_radioButton"
        />
    );
};

export default memo(SpaceAndChannelJoinRuleSettings);
