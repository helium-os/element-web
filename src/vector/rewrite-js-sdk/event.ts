import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { getRoomType, RoomType } from "./room";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { EffectiveMembership, getEffectiveMembership } from "matrix-react-sdk/src/utils/membership";

export enum AdditionalEventType {
    // Room state events
    RoomEnableDefaultUserSendMsg = "m.room.enable_default_user_send_message", // 启用|禁用普通用户发送消息
    RoomEnableDefaultUserMemberList = "m.room.enable_default_user_member_list", // 启用|禁用普通用户展示成员列表
}

MatrixEvent.prototype.getRoomType = function (): RoomType {
    const roomId = this.getRoomId();
    return getRoomType(roomId);
};

MatrixEvent.prototype.getRoomTypeLabel = function (): string {
    return _t(this.getRoomType());
};

// 是否是拒绝邀请的Event
MatrixEvent.prototype.isRejectInvite = function (): boolean {
    return (
        this.getType() === EventType.RoomMember &&
        getEffectiveMembership(this.getContent().membership) === EffectiveMembership.Leave &&
        this.getSender() === this.getStateKey() &&
        getEffectiveMembership(this.getPrevContent().membership) === EffectiveMembership.Invite
    );
};
