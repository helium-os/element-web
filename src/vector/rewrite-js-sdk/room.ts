import {Room} from "matrix-js-sdk/src/models/room";
import DMRoomMap from "../../matrix-react-sdk/src/utils/DMRoomMap";


// 判断管理员是否已离开房间
Room.prototype.isAdminLeft = function(): boolean {
    return this.currentState.isAdminLeft();
}

// 是否是私聊房间
Room.prototype.isPeopleRoom = function(): boolean {
    return !!DMRoomMap.shared().getUserIdForRoomId(this.roomId);
}

// 是否是否可以邀请其他人
const _canInvite = Room.prototype.canInvite;
Room.prototype.canInvite = function(userId: string): boolean {
    const canInvite = _canInvite.call(this, userId);
    return canInvite && !this.isPeopleRoom() && !this.isAdminLeft(); // 私聊不展示邀请按钮；群聊房间如果管理员离开了也不展示邀请按钮
}
