import { PowerStatus } from "matrix-react-sdk/src/components/views/rooms/EntityTile";
import { RoomType } from "../vector/rewrite-js-sdk/room";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import { Tag } from "matrix-react-sdk/src/stores/room-list/models";

declare module "matrix-js-sdk/src/client" {
    interface MatrixClient {
        setRoomOnlyTags(roomId: string, tags: Tag[]): Promise<ISendEventResponse>;
        getRoomOnlyTags(roomId: string): Promise<Record<string, any>>;
    }
}

declare module "matrix-js-sdk/src/models/room-state" {
    interface RoomState {
        isAdminLeft(): boolean;
    }
}

declare module "matrix-js-sdk/src/models/room" {
    export interface Room {
        isAdminLeft(): boolean;
        isPeopleRoom(): boolean;
        getRoomType(): RoomType;
        getRoomTypeLabel(): string;
        getMemberName(userId: string): string;
        getMemberEmail(userId: string): string;
        getRoomTags(): Tag[];
        getUserTags(): Tag[];
        getAllTags(): Tag[];
    }
}

declare module "matrix-js-sdk/src/models/room-member" {
    interface RoomMember {
        getPowerStatus(): PowerStatus;
        isAdmin(): boolean;
    }
}

declare module "matrix-js-sdk/src/models/event" {
    interface MatrixEvent {
        getRoomType(): RoomType;
        getRoomTypeLabel(): string;
    }
}
