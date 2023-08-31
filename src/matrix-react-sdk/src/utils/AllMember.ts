import {RoomMember} from "matrix-js-sdk/src/models/room-member";
import {_t} from "../languageHandler";
import User from "./User";

export default class AllMember {
    private userId = 'All';
    private roomMap = new Map();

    public static instance(): AllMember {
        if (!window.allMemberInstance) {
            window.allMemberInstance = new AllMember();
        }
        return window.allMemberInstance;
    }

    private generateAllMemberId(roomId: string): string {
        const hsName = roomId.split(':')[1];
        return User.instance().generateUserIdByHsName(this.userId, hsName);
    }

    private generateAllMemberName(): string {
        return _t('All member');
    }

    private createAllMember(roomId: string): RoomMember {
        const allMember = new RoomMember(roomId, this.generateAllMemberId(roomId));
        allMember.name = allMember.rawDisplayName = this.generateAllMemberName();
        return allMember;
    }

    public setAllMember(roomId, member: RoomMember): void {
        this.roomMap.set(roomId, member);
    }

    public getAllMember(roomId: string): RoomMember {
        if (!this.roomMap.get(roomId)) {
            const member = this.createAllMember(roomId);
            this.setAllMember(roomId, member);
        }
        return this.roomMap.get(roomId);
    }

    public getAllMemberName(roomId?: string): string {
        const allMember = this.getAllMember(roomId);
        return allMember ? (allMember.name || allMember.rawDisplayName) : this.generateAllMemberName();
    }

    public getAllMemberId(roomId: string): string {
        const allMember = this.getAllMember(roomId);
        return allMember?.userId;
    }

    public isAllMember(userId: string, roomId?: string): boolean {
        return (roomId && userId === this.getAllMemberId(roomId)) || userId.split(':')[0]?.split('@')?.[1] === this.userId;
    }
}
