import 'matrix-js-sdk';
import {PowerStatus} from "../matrix-react-sdk/src/components/views/rooms/EntityTile";

declare module 'matrix-js-sdk' {
    export interface RoomState {
        isAdminLeft(): boolean;
    }

    export interface Room {
        isAdminLeft(): boolean;
        isPeopleRoom(): boolean;
    }

    export interface RoomMember {
        getPowerStatus(): PowerStatus;
        isAdmin(): boolean;
    }
}


