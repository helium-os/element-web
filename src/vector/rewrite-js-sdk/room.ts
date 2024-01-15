import { Room } from "matrix-js-sdk/src/models/room";
import DMRoomMap from "../../matrix-react-sdk/src/utils/DMRoomMap";
import { _t } from "matrix-react-sdk/src/languageHandler";
import OrgStore from "matrix-react-sdk/src/stores/OrgStore";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { PreferredRoomVersions } from "matrix-react-sdk/src/utils/PreferredRoomVersions";
import { JoinRule } from "matrix-js-sdk/src/@types/partials";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { hasStateEventPermission, StateEvent } from "matrix-react-sdk/src/powerLevel";
import { DefaultTagID, TagID } from "matrix-react-sdk/src/stores/room-list/models";
import RoomListActions from "matrix-react-sdk/src/actions/RoomListActions";

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
const _canInvite = Room.prototype.canInvite;
Room.prototype.canInvite = function (userId: string): boolean {
    const canInvite = _canInvite.call(this, userId);
    return canInvite && !this.isPeopleRoom() && !this.isAdminLeft(); // 私聊不展示邀请按钮；群聊房间如果管理员离开了也不展示邀请按钮
};

// 判断是否可以移除用户
Room.prototype.canRemoveUser = function (userId?: string) {
    return hasStateEventPermission(this, StateEvent.Kick, userId);
};

// 判断是否展示成员列表
Room.prototype.displayMemberList = function (userId?: string) {
    return hasStateEventPermission(this, StateEvent.DisplayMemberList, userId);
};

// 判断是否可以删除room
Room.prototype.canDeleteRoom = function (userId?: string) {
    return hasStateEventPermission(this, StateEvent.Delete, userId);
};

// 判断是否可以增删改Tag
Room.prototype.canManageTag = function (userId: string) {
    if (this.getMyMembership() !== "join") {
        return false;
    }

    return this.currentState.maySendStateEvent(EventType.Tag, userId);
};

// 获取当前room的parents room
Room.prototype.getParents = function () {
    return getRoomParents(this.roomId);
};

// 判断当前room是否是社区内的频道
Room.prototype.isSpaceChannel = function () {
    return this.getParents().length > 0;
};
