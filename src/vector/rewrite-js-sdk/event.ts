import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {_t} from "matrix-react-sdk/src/languageHandler";
import {getRoomType, RoomType} from "./room";

MatrixEvent.prototype.getRoomType = function(): RoomType {
    const roomId = this.getRoomId();
    return getRoomType(roomId);
}

MatrixEvent.prototype.getRoomTypeLabel = function(): string {
    return _t(this.getRoomType());
}
