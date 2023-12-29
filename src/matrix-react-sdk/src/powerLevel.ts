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

// state powerLevel
export function getDefaultPowerLevels(roomType: RoomType | string, joinRule: JoinRule): PowerLevelsMap {
    const isSpaceRoom = roomType === RoomType.Space;
    return {
        users_default: PowerLevel.Default,
        state_default: PowerLevel.Moderator,
        events_default: isSpaceRoom ? PowerLevel.Admin : PowerLevel.Default, // 哪些角色可以发送消息
        invite: isSpaceRoom && isPrivateRoom(joinRule) ? PowerLevel.Moderator : PowerLevel.Default, // 私密社区协管员及以上权限才可以邀请
        kick: PowerLevel.Moderator,
        ban: PowerLevel.Moderator,
        redact: PowerLevel.Moderator,
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
    };

    return eventType ? eventPowerLevelLabels[eventType] : eventPowerLevelLabels;
}
export function getPowerLevelsDescriptors(roomType: RoomType | string, joinRule): PowerLevelDescriptorMap {
    const powerLevels = getDefaultPowerLevels(roomType, joinRule);
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
    const isSpaceRoom = roomType === RoomType.Space;

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
        [EventType.Reaction]: isSpaceRoom ? PowerLevel.Admin : PowerLevel.Default,
        [EventType.RoomRedaction]: isSpaceRoom ? PowerLevel.Admin : PowerLevel.Default,

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
    const isSpaceRoom = roomType === RoomType.Space;

    const eventPowerLevelLabels: EventPowerLevelOptsMap = {
        [EventType.RoomAvatar]: {
            label: isSpaceRoom ? _t("Change space avatar") : _t("Change room avatar"),
        },
        [EventType.RoomName]: {
            label: isSpaceRoom ? _t("Change space name") : _t("Change room name"),
        },
        [EventType.RoomCanonicalAlias]: {
            label: isSpaceRoom ? _t("Change main address for the space") : _t("Change main address for the room"),
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
            label: isSpaceRoom ? _t("Change description") : _t("Change topic"),
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
            label: isSpaceRoom ? null : _t("Modify widgets"),
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
