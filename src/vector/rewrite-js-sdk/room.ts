import {Room} from "matrix-js-sdk/src/models/room";
import DMRoomMap from "../../matrix-react-sdk/src/utils/DMRoomMap";
import {_t} from "matrix-react-sdk/src/languageHandler";

export enum RoomType {
    people = 'people', // 私聊
    channel = 'channel' // 频道
}

export function isPeopleRoom(roomId: string) {
    return !!DMRoomMap.shared().getUserIdForRoomId(roomId);
}

export function getRoomType(roomId: string) {
    return RoomType[isPeopleRoom(roomId) ? 'people' : 'channel'];
}


// 判断管理员是否已离开房间
Room.prototype.isAdminLeft = function(): boolean {
    return this.currentState.isAdminLeft();
}

// 是否是私聊房间
Room.prototype.isPeopleRoom = function(): boolean {
    return isPeopleRoom(this.roomId);
}

// 判断是否可以邀请其他人
const _canInvite = Room.prototype.canInvite;
Room.prototype.canInvite = function(userId: string): boolean {
    const canInvite = _canInvite.call(this, userId);
    return canInvite && !this.isPeopleRoom() && !this.isAdminLeft(); // 私聊不展示邀请按钮；群聊房间如果管理员离开了也不展示邀请按钮
}

// 获取房间类型  私聊|频道（群聊）
Room.prototype.getRoomType = function(): RoomType {
    return getRoomType(this.roomId);
}

// 获取房间类型文本
Room.prototype.getRoomTypeLabel = function(): string {
    return _t(this.getRoomType());
}
