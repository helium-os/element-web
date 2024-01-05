import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { getRoomType, RoomType } from "./room";

export enum AdditionalEventType {
    // Room state events
    RoomEnableDefaultUserSendMsg = "m.room.enable_default_user_send_message", // 启用|禁用普通用户发送消息
    RoomEnableDefaultUserMemberList = "m.room.enable_default_user_member_list", // 启用|禁用普通用户展示成员列表
    RoomOrder = "m.room.order", // room排序
}

MatrixEvent.prototype.getRoomType = function (): RoomType {
    const roomId = this.getRoomId();
    return getRoomType(roomId);
};

MatrixEvent.prototype.getRoomTypeLabel = function (): string {
    return _t(this.getRoomType());
};
