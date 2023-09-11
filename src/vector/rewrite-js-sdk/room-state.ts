import {RoomState} from "matrix-js-sdk/src/models/room-state";

/**
 * 判断管理员是否已离开房间
 *
 * 用来实现以下交互：
 * 私聊里，一方主动离开之后，另外一方除了看聊天记录以外不能做其他操作；
 * 群聊里，管理员离开后， 其他人除了看聊天记录以外不能做其他操作；
 * tips: 私聊里因为两人都为管理员角色，所以可以用此条件来判断是否有一方离开了
 */
RoomState.prototype.isAdminLeft = function(): boolean {
    const members = this.getMembers();
    const adminMembers = members.filter(item => item.isAdmin());
    return !!adminMembers.find(item => item.membership === 'leave');
}
