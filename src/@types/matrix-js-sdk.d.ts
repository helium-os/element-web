import {PowerStatus} from "../matrix-react-sdk/src/components/views/rooms/EntityTile";

declare module 'matrix-js-sdk/src/models/room-state' {
    interface RoomState {
        isAdminLeft(): boolean;
    }
}


declare module 'matrix-js-sdk/src/models/room' {
    export interface Room {
        isAdminLeft(): boolean;
        isPeopleRoom(): boolean;
    }
}

declare module 'matrix-js-sdk/src/models/room-member' {
    interface RoomMember {
        getPowerStatus(): PowerStatus;
        isAdmin(): boolean;
    }
}


