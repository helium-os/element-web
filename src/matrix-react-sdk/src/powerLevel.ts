import { EventType, RoomType } from "matrix-js-sdk/src/@types/event";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";
import { isPrivateRoom } from "../../vector/rewrite-js-sdk/room";
import { _t, _td } from "matrix-react-sdk/src/languageHandler";
import { ElementCall } from "matrix-react-sdk/src/models/Call";
import { VoiceBroadcastInfoEventType } from "matrix-react-sdk/src/voice-broadcast";

export enum PowerLevel {
    Admin = 100, // 管理员
    Moderator = 50, // 协管员
    Default = 0, // 普通用户
}
export const PowerLabel: Record<PowerLevel, string> = {
    [PowerLevel.Admin]: _td("Admin"),
    [PowerLevel.Moderator]: _td("Mod"),
    [PowerLevel.Default]: _td("Default"),
};

interface InitPowerLevelsParams {
    isSpace?: boolean;
    enableDefaultUserSendMsg?: boolean;
    enableDefaultUserMemberList?: boolean;
}

interface PowerLevelsMap {
    [type: string]: PowerLevel;
}

interface PowerLevelDescriptorItem {
    label: string;
    defaultValue: PowerLevel;
}

type PowerLevelOpts = Omit<PowerLevelDescriptorItem, "defaultValue">;
interface PowerLevelOptsMap {
    [eventType: string]: PowerLevelOpts;
}
interface PowerLevelDescriptorMap {
    [eventType: string]: PowerLevelDescriptorItem;
}

interface EventPowerLevelDescriptorItem {
    label: string;
    defaultValue: PowerLevel;
}

type EventPowerLevelOpts = Omit<EventPowerLevelDescriptorItem, "defaultValue">;
interface EventPowerLevelOptsMap {
    [eventType: string]: EventPowerLevelOpts;
}
interface EventPowerLevelDescriptorsMap {
    [eventType: string]: EventPowerLevelDescriptorItem;
}

export function isSpaceRoom(roomType: RoomType | string): boolean {
    return roomType === RoomType.Space;
}

// state powerLevel
export function getDefaultStatePowerLevels(roomType: RoomType | string, joinRule: JoinRule): PowerLevelsMap {
    const isSpace = isSpaceRoom(roomType);
    return {
        users_default: PowerLevel.Default,
        state_default: PowerLevel.Moderator,
        events_default: isSpace ? PowerLevel.Admin : PowerLevel.Default, // 哪些角色可以发送消息
        invite: isSpace && isPrivateRoom(joinRule) ? PowerLevel.Moderator : PowerLevel.Default, // 私密社区协管员及以上权限才可以邀请
        kick: PowerLevel.Moderator,
        ban: PowerLevel.Moderator,
        redact: PowerLevel.Moderator,
        display_member_list: isSpace ? PowerLevel.Moderator : PowerLevel.Default, // 哪些角色可以展示成员列表
        // "notifications.room": PowerLevel.Moderator,
    };
}
export function getPowerLevelOpts(eventType: string): PowerLevelOpts | PowerLevelOptsMap {
    const eventPowerLevelLabels: PowerLevelOptsMap = {
        users_default: {
            label: _t("Default role"),
        },
        events_default: {
            label: _t("Send messages"),
        },
        invite: {
            label: _t("Invite users"),
        },
        state_default: {
            label: _t("Change settings"),
        },
        kick: {
            label: _t("Remove users"),
        },
        ban: {
            label: _t("Ban users"),
        },
        redact: {
            label: _t("Remove messages sent by others"),
        },
        "notifications.room": {
            label: _t("Notify everyone"),
        },
        display_member_list: {
            label: "展示成员列表",
        },
    };

    return eventType ? eventPowerLevelLabels[eventType] : eventPowerLevelLabels;
}
export function getPowerLevelsDescriptors(roomType: RoomType | string, joinRule): PowerLevelDescriptorMap {
    const powerLevels = getDefaultStatePowerLevels(roomType, joinRule);
    const eventPowerLevelsDescriptors = {};
    Object.keys(powerLevels).forEach((eventType) => {
        eventPowerLevelsDescriptors[eventType] = {
            ...getPowerLevelOpts(eventType),
            defaultValue: powerLevels[eventType],
        };
    });
    return eventPowerLevelsDescriptors;
}

// event powerLevel
export function getDefaultEventPowerLevels(roomType: RoomType | string): PowerLevelsMap {
    const isSpace = isSpaceRoom(roomType);

    return {
        [EventType.RoomAvatar]: PowerLevel.Moderator,
        [EventType.RoomTopic]: PowerLevel.Moderator,
        [EventType.RoomName]: PowerLevel.Moderator,
        [EventType.RoomCanonicalAlias]: PowerLevel.Moderator,
        [EventType.SpaceChild]: PowerLevel.Moderator,
        [EventType.RoomPinnedEvents]: PowerLevel.Moderator,
        [EventType.RoomHistoryVisibility]: PowerLevel.Admin,
        [EventType.RoomPowerLevels]: PowerLevel.Admin,
        [EventType.RoomTombstone]: PowerLevel.Admin,
        [EventType.RoomEncryption]: PowerLevel.Admin,
        [EventType.RoomServerAcl]: PowerLevel.Admin,
        [EventType.Reaction]: isSpace ? PowerLevel.Admin : PowerLevel.Default,
        [EventType.RoomRedaction]: isSpace ? PowerLevel.Admin : PowerLevel.Default,

        // MSC3401: Native Group VoIP signaling
        [ElementCall.CALL_EVENT_TYPE.name]: PowerLevel.Moderator,
        [ElementCall.MEMBER_EVENT_TYPE.name]: PowerLevel.Moderator,

        // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
        "im.vector.modular.widgets": PowerLevel.Moderator,
        [VoiceBroadcastInfoEventType]: PowerLevel.Moderator,
    };
}
export function getEventPowerLevelOpts(
    eventType: string,
    roomType: RoomType | string,
): EventPowerLevelOpts | EventPowerLevelOptsMap {
    const isSpace = isSpaceRoom(roomType);

    const eventPowerLevelLabels: EventPowerLevelOptsMap = {
        [EventType.RoomAvatar]: {
            label: isSpace ? _t("Change space avatar") : _t("Change room avatar"),
        },
        [EventType.RoomName]: {
            label: isSpace ? _t("Change space name") : _t("Change room name"),
        },
        [EventType.RoomCanonicalAlias]: {
            label: isSpace ? _t("Change main address for the space") : _t("Change main address for the room"),
        },
        [EventType.SpaceChild]: {
            label: _t("Manage rooms in this space"),
        },
        [EventType.RoomHistoryVisibility]: {
            label: _t("Change history visibility"),
        },
        [EventType.RoomPowerLevels]: {
            label: _t("Change permissions"),
        },
        [EventType.RoomTopic]: {
            label: isSpace ? _t("Change description") : _t("Change topic"),
        },
        [EventType.RoomTombstone]: {
            label: _t("Upgrade the room"),
        },
        [EventType.RoomEncryption]: {
            label: _t("Enable room encryption"),
        },
        [EventType.RoomServerAcl]: {
            label: _t("Change server ACLs"),
        },
        [EventType.Reaction]: {
            label: _t("Send reactions"),
        },
        [EventType.RoomRedaction]: {
            label: _t("Remove messages sent by me"),
        },

        [EventType.RoomPinnedEvents]: {
            label: _t("Manage pinned events"),
        },

        // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
        "im.vector.modular.widgets": {
            label: isSpace ? null : _t("Modify widgets"),
        },
        [VoiceBroadcastInfoEventType]: {
            label: _t("Voice broadcasts"),
        },
    };

    return eventType ? eventPowerLevelLabels[eventType] : eventPowerLevelLabels;
}
export function getEventPowerLevelsDescriptors(roomType: RoomType | string): EventPowerLevelDescriptorsMap {
    const eventPowerLevels = getDefaultEventPowerLevels(roomType);
    const eventPowerLevelsDescriptors = {};
    Object.keys(eventPowerLevels).forEach((eventType) => {
        eventPowerLevelsDescriptors[eventType] = {
            label: getEventPowerLevelOpts(eventType, roomType),
            defaultValue: eventPowerLevels[eventType],
        };
    });
    return eventPowerLevelsDescriptors;
}

// 通过是否允许普通用户发送信息来计算events_default（是否可以发送消息）的值
export function getPowerLevelByEnableDefaultUserSendMsg(enable: boolean, isSpace = false): PowerLevelsMap {
    return !isSpace
        ? {
              events_default: enable ? PowerLevel.Default : PowerLevel.Moderator,
          }
        : {};
}

// 通过是否允许普通用户展示成员列表信息来计算display_member_list（是否展示成员列表）的值
export function getPowerLevelByEnableDefaultUserMemberList(enable: boolean, isSpace = false): PowerLevelsMap {
    return !isSpace
        ? {
              display_member_list: enable ? PowerLevel.Default : PowerLevel.Moderator,
          }
        : {};
}

// 获取初始化powerLevels
export function getInitStatePowerLevels({
    isSpace = false,
    enableDefaultUserSendMsg,
    enableDefaultUserMemberList,
}: InitPowerLevelsParams): PowerLevelsMap {
    return {
        ...getPowerLevelByEnableDefaultUserSendMsg(enableDefaultUserSendMsg, isSpace),
        ...getPowerLevelByEnableDefaultUserMemberList(enableDefaultUserMemberList, isSpace),
    };
}
