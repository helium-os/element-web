import { RoomState } from "matrix-js-sdk/src/models/room-state";
import { isPeopleRoom } from "./room";

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
