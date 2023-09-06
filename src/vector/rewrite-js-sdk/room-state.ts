import {RoomState} from "matrix-js-sdk/src/models/room-state";

// 判断管理员是否已离开房间
RoomState.prototype.isAdminLeft = function(): boolean {
    const members = this.getMembers();
    const adminMember = members.find(item => item.isAdmin());
    return !adminMember || adminMember.membership === 'leave';
}
