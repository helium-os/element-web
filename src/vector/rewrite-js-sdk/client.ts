import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";

/**
 * setRoomOnlyTags -设置room tag（tag只打在room上）
 * setRoomTag - 设置room +user tag（tag是打在user + room上的）
 */
MatrixClient.prototype.setRoomOnlyTags = function (roomId: string, tags: any) {
    return this.sendStateEvent(roomId, EventType.Tag, {
        tags,
    });
};
