import {RoomMember} from "matrix-js-sdk/src/models/room-member";
import {_t} from "../languageHandler";
import OrgStore from "../stores/OrgStore";

export function getAllMemberId(orgId?: string): string {
    orgId = orgId ?? OrgStore.sharedInstance().getCurrentOrgId();
    return `@All:chat.${orgId}`;
}
export function getAllMemberName() {
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
