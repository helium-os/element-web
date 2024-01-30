import { RoomType } from "../vector/rewrite-js-sdk/room";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { Tag, TagID } from "matrix-react-sdk/src/stores/room-list/models";
import { IPowerLevelsContent } from "matrix-js-sdk/src/models/room-state";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { StateEvent } from "matrix-react-sdk/src/powerLevel";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { AdditionalEventType } from "../vector/rewrite-js-sdk/event";

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
        deleteRoom(roomId: string): Promise<{}>;
        batchLeave(roomId: string, userId?: string, reason?: string): Promise<{}>;
    }
}

declare module "matrix-js-sdk/src/models/room-state" {
    type IEventType = StateEvent | EventType | AdditionalEventType | string;
    interface RoomState {
        isAdminLeft(): boolean;
        getPowerLevels(): IPowerLevelsContent;
        hasEventTypePermission(eventType: IEventType, userId: string, state: boolean, cli?: MatrixClient): boolean;
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
        getRoomOrderInTag(tagId: TagID): number | undefined;
        isRestrictedRoom(): boolean;
        isPrivateRoom(): boolean;
        canRemoveUser(userId?: string): boolean;
        displayMemberList(userId?: string): boolean;
        canDeleteRoom(userId?: string): boolean;
        canManageTag(userId: string): boolean;
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
        isRejectInvite(): boolean;
    }
}
