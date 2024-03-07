import { NotificationCountType, Room } from "matrix-js-sdk/src/models/room";
import DMRoomMap from "../../matrix-react-sdk/src/utils/DMRoomMap";
import { _t } from "matrix-react-sdk/src/languageHandler";
import OrgStore from "matrix-react-sdk/src/stores/OrgStore";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { PreferredRoomVersions } from "matrix-react-sdk/src/utils/PreferredRoomVersions";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { PowerLevel, StateEventType } from "matrix-react-sdk/src/powerLevel";
import { DefaultTagID, TagID } from "matrix-react-sdk/src/stores/room-list/models";
import RoomListActions from "matrix-react-sdk/src/actions/RoomListActions";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { determineUnreadState } from "matrix-react-sdk/src/RoomNotifs";
import { NotificationColor } from "matrix-react-sdk/src/stores/notifications/NotificationColor";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";

export enum RoomType {
    People = "people", // 私聊
    Room = "room", // 群聊
    Channel = "channel", // 频道
}

export function isPeopleRoom(roomId: string) {
    return !!DMRoomMap.shared().getUserIdForRoomId(roomId);
}

export function getRoomType(roomId: string) {
    return !SpaceStore.instance.isHomeSpace ? RoomType.Channel : isPeopleRoom(roomId) ? RoomType.People : RoomType.Room;
}

export function getRoomTypeLabel(roomId: string) {
    return _t(getRoomType(roomId));
}

export function isPrivateRoom(joinRule: JoinRule) {
    return joinRule === JoinRule.Invite;
}

export function getRoomParents(roomId: string) {
    return SpaceStore.instance.getParents(roomId, false, false);
}

// 判断管理员是否已离开房间
Room.prototype.isAdminLeft = function (): boolean {
    return this.currentState.isAdminLeft();
};

// 是否是私聊房间
Room.prototype.isPeopleRoom = function (): boolean {
    return isPeopleRoom(this.roomId);
};

// 获取房间类型  私聊|频道（群聊）
Room.prototype.getRoomType = function (): RoomType {
    return getRoomType(this.roomId);
};

// 获取房间类型文本
Room.prototype.getRoomTypeLabel = function (): string {
    return _t(this.getRoomType());
};

// 获取房间成员名称
Room.prototype.getMemberName = function (userId: string): string {
    const member = this.getMember(userId!);
    return member?.name || member?.rawDisplayName;
};

// 获取房间成员邮箱(userName@orgAlias)
Room.prototype.getMemberEmail = function (userId: string): string {
    const name = this.getMemberName(userId);
    if (!name) return userId;
    const orgId = OrgStore.sharedInstance().getUserOrgId(userId);
    const orgAlias = OrgStore.sharedInstance().getOrgAliasById(orgId);
    return `${name}@${orgAlias}`;
};

// 获取只打在room上的tag
Room.prototype.getRoomTags = function () {
    return this.currentState.getStateEvents(EventType.Tag, "")?.getContent()?.tags ?? [];
};

// 获取当前用户打在room上的tag（获取打在user + room上的tag）
Room.prototype.getUserTags = function () {
    return Object.entries(this.tags).map(([key, value]) => ({
        tagId: key,
        ...value,
    }));
};

// 获取当前room的所有tag
Room.prototype.getAllTags = function () {
    try {
        const tags = this.getRoomTags();
        return [
            ...this.getUserTags(), // 打在user + room上的tag
            ...tags, // 只打在room上的tag
        ];
    } catch (error) {
        return this.getUserTags();
    }
};

/**
 * 获取room在某个分组下的排序
 * @param tagId
 *
 * 这里的order表示在某个分组（tag）下room的排序，而不是该分组自身的排序
 * 这样设计是为了兼容一个room归属于多个分组的情况
 */
Room.prototype.getRoomOrderInTag = function (tagId: TagID) {
    const allTags = this.getAllTags();
    const roomTagInfo = allTags.find(
        (item) => item.tagId === tagId || (!item.tagId && tagId === DefaultTagID.Untagged),
    );
    return +(roomTagInfo?.order || RoomListActions.defaultOrder);
};

/**
 * 判断是否为社区内公开频道
 * tips: 对社区成员可见的频道视为公开频道
 */
Room.prototype.isRestrictedRoom = function () {
    return this.getJoinRule() === JoinRule.Restricted && this.getVersion() === PreferredRoomVersions.RestrictedRooms;
};

/**
 * 判断是否为私密频道
 * tips: 对社区成员可见的频道视为公开频道
 */
Room.prototype.isPrivateRoom = function () {
    return isPrivateRoom(this.getJoinRule());
};

// 判断是否可以邀请其他人
Room.prototype.canInvite = function (userId: string): boolean {
    return (
        this.currentState.hasEventTypePermission(StateEventType.Invite, userId, true) &&
        !this.isPeopleRoom() && // 私聊不展示邀请按钮
        !this.isAdminLeft() // 群聊房间如果管理员离开了也不展示邀请按钮
    );
};

// 判断是否可以移除用户
Room.prototype.canRemoveUser = function (userId?: string) {
    return this.currentState.hasEventTypePermission(StateEventType.Kick, userId, true);
};

/**
 * 校验当前用户是否可以移除某个用户
 * @param member 被移除的用户
 * @param canRemoveUser 当前用户是否有移除他人的权限
 */
Room.prototype.validCanKickMember = function (member: RoomMember, canRemoveUser: boolean) {
    if (!canRemoveUser) return false;

    const cli = MatrixClientPeg.get();
    const myUserId = cli.getUserId();
    const isMe = member.userId === myUserId;
    if (isMe) return false;

    const plContent = this.currentState.getPowerLevels();
    const userLevels = plContent.users || {};
    const myUserLevel = userLevels[myUserId];
    const memberLevel = userLevels[member.userId] || PowerLevel.Default;

    return myUserLevel > memberLevel; // 只能移除比当前用户自身权利低的用户
};

// 判断是否展示成员列表
Room.prototype.displayMemberList = function (userId?: string) {
    return this.currentState.hasEventTypePermission(StateEventType.DisplayMemberList, userId, true);
};

// 判断是否可以删除room
Room.prototype.canDeleteRoom = function (userId?: string) {
    return this.currentState.hasEventTypePermission(StateEventType.Delete, userId, true);
};

// 判断是否可以增删改Tag
Room.prototype.canManageTag = function (userId: string) {
    return this.currentState.hasEventTypePermission(EventType.Tag, userId, false);
};

// 获取当前room的parents room
Room.prototype.getParents = function () {
    return getRoomParents(this.roomId);
};

// 判断当前room是否是社区内的频道
Room.prototype.isSpaceChannel = function () {
    return this.getParents().length > 0;
};

// 获取单个消息列的真实的未读消息数
Room.prototype.getThreadNotificationCount = function (threadId: string) {
    return {
        highlight: this.getThreadUnreadNotificationCount(threadId, NotificationCountType.Highlight),
        total: this.getThreadUnreadNotificationCount(threadId, NotificationCountType.Total),
    };
};

// 获取单个消息列经过处理后的消息数 & color
Room.prototype.getThreadUnreadState = function (threadId: string) {
    return determineUnreadState(this, threadId);
};

Object.defineProperties(Room.prototype, {
    // 获取当前room内所有消息列的真实的未读消息数
    threadsNotificationCount: {
        get: function () {
            let highlightCount = 0,
                totalCount = 0;

            for (const threadId of this.threadNotifications.keys()) {
                highlightCount += this.getThreadUnreadNotificationCount(threadId, NotificationCountType.Highlight);
                totalCount += this.getThreadUnreadNotificationCount(threadId, NotificationCountType.Total);
            }

            return {
                highlight: highlightCount,
                total: totalCount,
            };
        },
    },
    // 获取当前room内所有消息列经过处理后的消息数 & color
    threadsNotificationTotalState: {
        get: function () {
            let count = 0;
            let color = NotificationColor.None;

            for (const threadId of this.threadNotifications.keys()) {
                const state = this.getThreadUnreadState(threadId);
                count += state.count;
                color = Math.max(color, state.color);
            }

            return {
                symbol: null,
                count,
                color,
            };
        },
    },
});

/**
 * 重写fetchRoomThreads，给room添加ThreadEvent.New事件的订阅
 * 订阅到新创建的消息列事件后，将threadRootEvent添加到threadsTimelines里
 *
 * bugfix:为了解决其他成员新创建的消息列在当前用户的消息列列表里不展示，只有该消息列有第二条回复 或者 刷新页面后才展示的bug
 *
 * 原因：
 * js-sdk里通过updateThreadRootEvents方法更新threadsTimelines
 * js-sdk里创建消息列成功以后会调用updateThreadRootEvents方法，但是该方法里判断了只有thread.length > 0的时候才更新threadsTimeline
 * 所以已存在的消息列有新的回复时会及时更新，而新创建的消息列因为此时thread.length为0，虽然调用了方法，但是并没有将新创建的threadRootEvent添加到threadsTimeline里
 *
 * 为什么这样改？
 * 基于上述原因，可以通过重写updateThreadRootEvents方法来实现，判断只要thread存在就执行方法，但是因为js-sdk里该方法为实例方法，并非原型方法，所以不能这样修改
 * js-sdk里room createThread完成后会emit ThreadEvent.New事件，最后决定通过订阅该事件，然后触发updateThreadRootEvent
 *
 * PS: 中间做过一版在ThreadPanel组件里给room订阅ThreadEvent.New事件的修改，但是在以下场景下仍然有bug:
 * @1 A频道的消息列为空时，点开其消息列面板，然后切换到B频道，切换后，其他用户在A频道发送该频道的第一个消息列，然后当前用户切换到A频道，其消息列面板仍然为空
 * @2 A频道的消息列为空时，用户点开其消息列面板，然后关闭面板，此时其他用户在A频道发送该频道的第一个消息列，当前用户再次点开消息列面板时，其消息列面板仍然为空
 * 以上两种场景出现bug的原因为：
 * #1 用户第一次点开每个room的消息列面板时，会调用fetchRoomThreads方法，该方法调用完成后，会设置room.threadsReady为true，而fetchRoomThreads内部判断room.threadsReady为false时才调用接口获取消息列列表，
 *    所以在不刷新页面的情况下，每个room只会调用一次获取消息列列表的接口，这也是为什么刷新页面后消息列列表会正常展示
 * #2 在A频道消息列面板不展示的情况，此时该频道有第一个消息列时，因为当前room的消息列列表面板组件已卸载，所以订阅不到ThreadEvent.New事件，导致threadsTimelines没有更新
 */
const _fetchRoomThreads = Room.prototype.fetchRoomThreads;
Room.prototype.fetchRoomThreads = function (...args): Promise<void> {
    const result = _fetchRoomThreads.call(this, ...args);
    this.on(ThreadEvent.New, this.onNewThread);
    return result;
};
Room.prototype.onNewThread = function (thread: Thread, toStartOfTimeline: boolean) {
    if (!thread) return;

    this.updateThreadRootEvent(this.threadsTimelineSets?.[0], thread, toStartOfTimeline, false);
    if (thread.hasCurrentUserParticipated) {
        this.updateThreadRootEvent(this.threadsTimelineSets?.[1], thread, toStartOfTimeline, false);
    }
};
