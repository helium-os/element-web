import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { Tag } from "matrix-react-sdk/src/stores/room-list/models";
import { AddEventType } from "./event";

/**
 * setRoomOnlyTags -设置room tag（tag只打在room上）
 * setRoomTag - 设置room +user tag（tag是打在user + room上的）
 */
MatrixClient.prototype.setRoomOnlyTags = function (roomId: string, tags: Tag[]) {
    return this.sendStateEvent(roomId, EventType.Tag, {
        tags,
    });
};

// 获取只打在room上的tag
MatrixClient.prototype.getRoomOnlyTags = function (roomId: string) {
    return this.getStateEvent(roomId, EventType.Tag, "");
};

// 设置room order
MatrixClient.prototype.setRoomOrder = function (roomId: string, order: string) {
    return this.sendStateEvent(roomId, AddEventType.RoomOrder, {
        order,
    });
};

// 获取room order
MatrixClient.prototype.getRoomOrder = function (roomId: string) {
    return this.getStateEvent(roomId, AddEventType.RoomOrder, "");
};
