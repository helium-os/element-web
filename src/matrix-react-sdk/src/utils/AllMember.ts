import {RoomMember} from "matrix-js-sdk/src/models/room-member";
import {_t} from "../languageHandler";
import User from "./User";
import {MatrixClientPeg} from "../MatrixClientPeg";

export function getAllMemberId(): string {
    const cli = MatrixClientPeg.get();
    return User.instance().generateUserIdByBaseUrl('All', cli.baseUrl);
}
export function getAllMemberName(): string {
    return _t('All member');
}

export function createAllMember(roomId: string): RoomMember {
    const allMember = new RoomMember(roomId, getAllMemberId());
    allMember.name = allMember.rawDisplayName = getAllMemberName();
    return allMember;
}

// 判断是否是All
export function isAllMember(userId: string): boolean {
    return userId === getAllMemberId();
}
