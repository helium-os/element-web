import { Room } from "matrix-js-sdk/src/models/room";
import DMRoomMap from "../../matrix-react-sdk/src/utils/DMRoomMap";
import { _t } from "matrix-react-sdk/src/languageHandler";
import OrgStore from "matrix-react-sdk/src/stores/OrgStore";
import { EventType } from "matrix-js-sdk/src/@types/event";

export enum RoomType {
    people = "people", // 私聊
    channel = "channel", // 频道
}

export function isPeopleRoom(roomId: string) {
    return !!DMRoomMap.shared().getUserIdForRoomId(roomId);
}

export function getRoomType(roomId: string) {
    return RoomType[isPeopleRoom(roomId) ? "people" : "channel"];
}

// 判断管理员是否已离开房间
Room.prototype.isAdminLeft = function (): boolean {
    return this.currentState.isAdminLeft();
};

// 是否是私聊房间
Room.prototype.isPeopleRoom = function (): boolean {
    return isPeopleRoom(this.roomId);
};

// 判断是否可以邀请其他人
const _canInvite = Room.prototype.canInvite;
Room.prototype.canInvite = function (userId: string): boolean {
    const canInvite = _canInvite.call(this, userId);
    return canInvite && !this.isPeopleRoom() && !this.isAdminLeft(); // 私聊不展示邀请按钮；群聊房间如果管理员离开了也不展示邀请按钮
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
    return this.currentState.getStateEvents(EventType.Tag, "")?.getContent().tags || [];
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
