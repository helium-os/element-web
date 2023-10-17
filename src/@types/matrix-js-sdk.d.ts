import { PowerStatus } from "matrix-react-sdk/src/components/views/rooms/EntityTile";
import { RoomType } from "../vector/rewrite-js-sdk/room";

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
