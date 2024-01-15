import { EventType } from "matrix-js-sdk/src/@types/event";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";
import { isPrivateRoom } from "../../vector/rewrite-js-sdk/room";
import { _t, _td } from "matrix-react-sdk/src/languageHandler";
import { ElementCall } from "matrix-react-sdk/src/models/Call";
import { VoiceBroadcastInfoEventType } from "matrix-react-sdk/src/voice-broadcast";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

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

export enum StateEvent {
    UsersDefault = "users_default",
    EventsDefault = "events_default",
    StateDefault = "state_default",
    Invite = "invite",
    Kick = "kick",
    Ban = "ban",
    Redact = "redact",
    Delete = "delete",
    DisplayMemberList = "display_member_list",
    ManagePrivateChannel = "manage_space_private_channel",
    NotificationRooms = "notifications.room",
}

/** ------------------------------- state powerLevel  -------------------------------**/
export function getDefaultStatePowerLevels(isSpace: boolean, joinRule: JoinRule): PowerLevelsMap {
    return {
        [StateEvent.UsersDefault]: PowerLevel.Default,
        [StateEvent.StateDefault]: PowerLevel.Moderator,
        [StateEvent.EventsDefault]: isSpace ? PowerLevel.Admin : PowerLevel.Default, // 哪些角色可以发送消息
        [StateEvent.Invite]: isSpace && isPrivateRoom(joinRule) ? PowerLevel.Moderator : PowerLevel.Default, // 私密社区协管员及以上权限才可以邀请
        [StateEvent.Kick]: PowerLevel.Moderator,
        [StateEvent.Ban]: PowerLevel.Moderator,
        [StateEvent.Redact]: PowerLevel.Moderator,
        [StateEvent.DisplayMemberList]: isSpace ? PowerLevel.Moderator : PowerLevel.Default, // 哪些角色可以展示成员列表
        ...(isSpace ? { [StateEvent.ManagePrivateChannel]: PowerLevel.Moderator } : {}), // 哪些角色可以管理社区内的私密频道
        [StateEvent.Delete]: isSpace ? PowerLevel.Admin : PowerLevel.Moderator, // 哪些角色可以删除room（只有管理员可以删除社区；管理员和协管员可以删除频道）
        // [StateEvent.NotificationRooms]: PowerLevel.Moderator,
    };
}

// 通过启用|禁用允许普通用户发送消息来计算events_default（是否可以发送消息）的powerLevel值
export function getPowerLevelByEnableDefaultUserSendMsg(enable: boolean, isSpace = false): PowerLevelsMap {
    return !isSpace
        ? {
              events_default: enable ? PowerLevel.Default : PowerLevel.Moderator,
          }
        : {};
}

// 通过启用|禁用允许普通用户展示成员列表来计算display_member_list（是否展示成员列表）的powerLevel值
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

// 判断用户是否有某些state event的权限
export function hasStateEventPermission(room: Room, key: string, userId?: string): boolean {
    if (room.getMyMembership() !== "join") {
        return false;
    }

    if (!userId) userId = MatrixClientPeg.get().getUserId()!;
    const me = room.getMember(userId);
    if (!me) {
        return false;
    }

    const powerLevelsEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, "");
    const powerLevels = powerLevelsEvent?.getContent() ?? {};

    let requiredLevel = powerLevels[key];
    if (!requiredLevel) {
        const isSpace = room.isSpaceRoom();
        const joinRule = room.getJoinRule();
        requiredLevel = getDefaultStatePowerLevels(isSpace, joinRule)?.[key];
    }

    return me.powerLevel >= requiredLevel;
}

export function getStatePowerLevelOpts(eventType: string, isSpace: boolean): PowerLevelOpts | PowerLevelOptsMap {
    const eventPowerLevelLabels: PowerLevelOptsMap = {
        [StateEvent.UsersDefault]: {
            label: _t("Default role"),
        },
        [StateEvent.EventsDefault]: {
            label: _t("Send messages"),
        },
        [StateEvent.StateDefault]: {
            label: _t("Change settings"),
        },
        [StateEvent.Invite]: {
            label: _t("Invite users"),
        },
        [StateEvent.Kick]: {
            label: _t("Remove users"),
        },
        [StateEvent.Ban]: {
            label: _t("Ban users"),
        },
        [StateEvent.Redact]: {
            label: _t("Remove messages sent by others"),
        },
        [StateEvent.NotificationRooms]: {
            label: _t("Notify everyone"),
        },
        [StateEvent.DisplayMemberList]: {
            label: "展示成员列表",
        },
        [StateEvent.Delete]: {
            label: isSpace
                ? _t("Delete Space")
                : _t("Delete room", {
                      roomType: _t("channel"),
                  }),
        },
    };

    return eventType ? eventPowerLevelLabels[eventType] : eventPowerLevelLabels;
}
export function getStatePowerLevelsDescriptors(isSpace: boolean, joinRule): PowerLevelDescriptorMap {
    const powerLevels = getDefaultStatePowerLevels(isSpace, joinRule);
    const eventPowerLevelsDescriptors = {};
    Object.keys(powerLevels).forEach((eventType) => {
        eventPowerLevelsDescriptors[eventType] = {
            ...getStatePowerLevelOpts(eventType, isSpace),
            defaultValue: powerLevels[eventType],
        };
    });
    return eventPowerLevelsDescriptors;
}

/** ------------------------------- event powerLevel  -------------------------------**/
export function getDefaultEventPowerLevels(isSpace: boolean): PowerLevelsMap {
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
    isSpace: boolean,
): EventPowerLevelOpts | EventPowerLevelOptsMap {
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
export function getEventPowerLevelsDescriptors(isSpace: boolean): EventPowerLevelDescriptorsMap {
    const eventPowerLevels = getDefaultEventPowerLevels(isSpace);
    const eventPowerLevelsDescriptors = {};
    Object.keys(eventPowerLevels).forEach((eventType) => {
        eventPowerLevelsDescriptors[eventType] = {
            label: getEventPowerLevelOpts(eventType, isSpace),
            defaultValue: eventPowerLevels[eventType],
        };
    });
    return eventPowerLevelsDescriptors;
}
