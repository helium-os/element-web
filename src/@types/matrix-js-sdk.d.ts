import { RoomType } from "../vector/rewrite-js-sdk/room";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { Tag } from "matrix-react-sdk/src/stores/room-list/models";

declare module "matrix-js-sdk/src/@types/partials" {
    interface IEnableSendMsgEventContent {
        enable: boolean;
    }

    interface IEnableMemberListContent {
        enable: boolean;
    }
}

declare module "matrix-js-sdk/src/client" {
    interface MatrixClient {
        setRoomOnlyTags(roomId: string, tags: Tag[]): Promise<ISendEventResponse>;
        getRoomOnlyTags(roomId: string): Promise<Record<string, any>>;
        setRoomOrder(roomId: string, order: string): Promise<ISendEventResponse>;
        getRoomOrder(roomId: string): Promise<Record<string, any>>;
    }
}

declare module "matrix-js-sdk/src/models/room-state" {
    interface RoomState {
        isAdminLeft(): boolean;
    }
}

declare module "matrix-js-sdk/src/models/room" {
    interface Room {
        isAdminLeft(): boolean;
        isPeopleRoom(): boolean;
        getRoomType(): RoomType;
        getRoomTypeLabel(): string;
        getMemberName(userId: string): string;
        getMemberEmail(userId: string): string;
        getRoomTags(): Tag[];
        getUserTags(): Tag[];
        getAllTags(): Tag[];
        getRoomOrder(): string;
        isRestrictedRoom(): boolean;
        isPrivateRoom(): boolean;
        canRemoveUser(userId: string): boolean;
        displayMemberList(userId: string): boolean;
        canOperateTag(userId: string): boolean;
        getParents(): Room[];
        isSpaceChannel(): boolean;
    }
}

declare module "matrix-js-sdk/src/models/room-member" {
    interface RoomMember {
        getPowerLevel(): number;
        isAdmin(): boolean;
        isModerator(): boolean;
    }
}

declare module "matrix-js-sdk/src/models/event" {
    interface MatrixEvent {
        getRoomType(): RoomType;
        getRoomTypeLabel(): string;
    }
}
