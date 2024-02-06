import { IEventType, IPowerLevelsContent, RoomState } from "matrix-js-sdk/src/models/room-state";
import { isPeopleRoom } from "./room";
import { getDefaultEventPowerLevels, getDefaultStatePowerLevels } from "matrix-react-sdk/src/powerLevel";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { MatrixClient } from "matrix-js-sdk/src/client";

/**
 * 判断管理员是否已离开房间
 *
 * 用来实现以下交互：
 * 私聊里，一方主动离开之后，另外一方除了看聊天记录以外不能做其他操作；
 * 群聊里，管理员离开后，其他人除了看聊天记录以外不能做其他操作；
 *
 *
 * tips:
 * 私聊里，因为两人都为管理员角色，所以有一人离开后，即视为管理员离开
 * 群聊里，可能会有多个管理员（比如社区管理员可以赋予其他人管理员角色），所以当所有管理员都离开时，才视为管理员离开
 */
RoomState.prototype.isAdminLeft = function (): boolean {
    const members = this.getMembers();
    const adminMembers = members.filter((item) => item.isAdmin());
    if (!adminMembers.length) return false; // 创建房间阶段，还未分配管理员
    return isPeopleRoom(this.roomId)
        ? adminMembers.some((item) => item.membership === "leave")
        : !adminMembers.some((item) => item.membership === "join");
};

RoomState.prototype.getPowerLevels = function (): IPowerLevelsContent {
    const powerLevelsEvent = this.getStateEvents(EventType.RoomPowerLevels, "");
    return powerLevelsEvent?.getContent() ?? {};
};

// 判断用户是否有某个事件类型的权限
RoomState.prototype.hasEventTypePermission = function (
    eventType: IEventType,
    userId: string,
    state: boolean,
    cli?: MatrixClient,
): boolean {
    if (!cli) cli = MatrixClientPeg.get();
    if (!userId) userId = cli.getUserId()!;

    const me = this.getMember(userId);
    if (!me || me?.membership !== "join") {
        return false;
    }

    const room = cli.getRoom(this.roomId);
    if (!room) {
        return false;
    }

    const powerLevels = this.getPowerLevels();

    let stateDefault = powerLevels.state_default!;
    if (!Number.isSafeInteger(stateDefault)) {
        stateDefault = 50;
    }

    let eventsDefault = powerLevels.events_default!;
    if (!Number.isSafeInteger(eventsDefault)) {
        eventsDefault = 0;
    }

    let usersDefault = powerLevels.users_default!;
    if (!Number.isSafeInteger(usersDefault)) {
        usersDefault = 0;
    }

    let userPowerLevel = powerLevels.users?.[userId];
    if (!Number.isSafeInteger(userPowerLevel)) {
        userPowerLevel = usersDefault;
    }

    const isSpace = room.isSpaceRoom();

    let requiredLevel;
    if (state) {
        requiredLevel = powerLevels[eventType];
        // 如果不存在，取default state powerLevel值
        if (requiredLevel === undefined) {
            const joinRule = this.getJoinRule();
            requiredLevel = getDefaultStatePowerLevels(isSpace, joinRule)[eventType];
        }
    } else {
        const eventsLevels: Record<EventType | string, number> = powerLevels.events || {};

        requiredLevel = eventsLevels[eventType];
        // 如果不存在，取default event powerLevel值
        if (requiredLevel === undefined) {
            requiredLevel = getDefaultEventPowerLevels(isSpace)[eventType];
        }
    }

    if (!Number.isSafeInteger(requiredLevel)) {
        requiredLevel = state ? stateDefault : eventsDefault;
    }

    return userPowerLevel >= requiredLevel;
};

// 重写方法
RoomState.prototype.maySendEventOfType = function (
    eventType: EventType | string,
    userId: string,
    state: boolean,
): boolean {
    return this.hasEventTypePermission(eventType, userId, state);
};
