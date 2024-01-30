import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { Tag } from "matrix-react-sdk/src/stores/room-list/models";
import * as utils from "matrix-js-sdk/src/utils";
import { ClientPrefix, Method } from "matrix-js-sdk/src/http-api";

export enum AdditionalClientPrefix {
    HeliumosV1 = "/_matrix/client/heliumos_v1",
}

MatrixClient.prototype.jwtLogin = function (data?: any): Promise<any> {
    return this.http.authedRequest(Method.Post, "/login", undefined, data, {
        baseUrl: "https://matrix.system.app.heliumos",
        prefix: AdditionalClientPrefix.HeliumosV1,
    });
};

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

// 删除room
MatrixClient.prototype.deleteRoom = function (roomId: string) {
    const path = utils.encodeUri("/rooms/$roomId", {
        $roomId: roomId,
    });
    return this.http.authedRequest(Method.Delete, path, undefined, undefined, { prefix: ClientPrefix.V3 });
};

/**
 * 批量离开room
 * @param roomId
 * 如果是space room，则批量离开space下的所有room & space room
 * 如果不是space room，只离开当前传入的room
 */
MatrixClient.prototype.batchLeave = function (roomId: string, userId?: string, reason?: string) {
    const path = utils.encodeUri("/rooms/$room_id/batch_leave", {
        $room_id: roomId,
    });
    return this.http.authedRequest(
        Method.Post,
        path,
        undefined,
        {
            user_id: userId,
            reason: reason,
        },
        { prefix: ClientPrefix.V3 },
    );
};
