/*
Copyright 2018 New Vector Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { MatrixClient } from "matrix-js-sdk/src/client";
import { Room } from "matrix-js-sdk/src/models/room";
import { logger } from "matrix-js-sdk/src/logger";

import { asyncAction } from "./actionCreators";
import Modal from "../Modal";
import * as Rooms from "../Rooms";
import { _t } from "../languageHandler";
import { AsyncActionPayload } from "../dispatcher/payloads";
import RoomListStore from "../stores/room-list/RoomListStore";
import { SortAlgorithm } from "../stores/room-list/algorithms/models";
import { DefaultTagID, TagID } from "../stores/room-list/models";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";

export default class RoomListActions {
    public static defaultOrder = "100";

    // 创建默认分组下的频道时生成order
    public static generateNewRoomOrderInUntaggedTag() {
        return this.generateOrderInTag(undefined, DefaultTagID.Untagged, undefined, 0);
    }

    // 创建频道时生成order
    public static generateNewRoomOrderInTag(tagId: TagID | null) {
        return this.generateOrderInTag(undefined, tagId, undefined, 0);
    }

    // 生成room order in tag
    public static generateOrderInTag(oldTag: TagID | null, newTag: TagID | null, oldIndex?: number, newIndex?: number) {
        const roomList = RoomListStore.instance.orderedLists[newTag];

        const isSameTag = newTag === oldTag; // 是否是同一个分组下的拖拽

        // 生成first room order
        if (!roomList.length) {
            return this.defaultOrder;
        }

        const step = 1;

        // 拖拽到第一个
        if (newIndex <= 0) {
            return String(roomList[0].getRoomOrderInTag(newTag) - step);
        }

        // 拖拽到最后一个
        if (newIndex >= roomList.length - (isSameTag ? 1 : 0)) {
            return String(roomList[roomList.length - 1].getRoomOrderInTag(newTag) + step);
        }

        // If the room was moved "down" (increasing index) in the same list we
        // need to use the orders of the tiles with indices shifted by +1
        const offset = isSameTag && newIndex > oldIndex ? 1 : 0;
        const indexBefore = offset + newIndex - 1;
        const indexAfter = offset + newIndex;
        const prevOrder = roomList[indexBefore].getRoomOrderInTag(newTag);
        const nextOrder = roomList[indexAfter].getRoomOrderInTag(newTag);

        return String((prevOrder + nextOrder) / 2.0);
    }

    /**
     * Creates an action thunk that will do an asynchronous request to
     * tag room.
     *
     * @param {MatrixClient} matrixClient the matrix client to set the
     *                                    account data on.
     * @param {Room} room the room to tag.
     * @param {string} oldTag the tag to remove (unless oldTag ==== newTag)
     * @param {string} newTag the tag with which to tag the room.
     * @param {?number} oldIndex the previous position of the room in the
     *                           list of rooms.
     * @param {?number} newIndex the new position of the room in the list
     *                           of rooms.
     * @returns {AsyncActionPayload} an async action payload
     * @see asyncAction
     */
    public static tagRoom(
        matrixClient: MatrixClient,
        room: Room,
        oldTag: TagID | null,
        newTag: TagID | null,
        oldIndex?: number,
        newIndex?: number,
    ): AsyncActionPayload {
        let order;

        // Is the tag ordered manually?
        const store = RoomListStore.instance;
        if (newTag && store.getTagSorting(newTag) === SortAlgorithm.Manual) {
            order = this.generateOrderInTag(oldTag, newTag, oldIndex, newIndex);
        }

        return asyncAction(
            "RoomListActions.tagRoom",
            () => {
                const promises: Promise<any>[] = [];
                const roomId = room.roomId;

                const hasChangedSubLists = oldTag !== newTag;

                // if we moved lists or the ordering changed, add the new tag
                if (newTag && newTag !== DefaultTagID.DM && (hasChangedSubLists || order)) {
                    // metaData is the body of the PUT to set the tag, so it must
                    // at least be an empty object.

                    const promiseToAdd = matrixClient
                        .setRoomOnlyTags(roomId, [
                            {
                                ...(newTag !== DefaultTagID.Untagged ? { tagId: newTag } : {}),
                                order,
                            },
                        ])
                        .catch(function (err) {
                            Modal.createDialog(ErrorDialog, {
                                title: _t("Failed to add tag %(tagName)s to room", { tagName: newTag }),
                                description: err && err.message ? err.message : _t("Operation failed"),
                            });

                            throw err;
                        });

                    promises.push(promiseToAdd);
                }

                return Promise.all(promises);
            },
            () => {
                // For an optimistic update
                return {
                    room,
                    oldTag,
                    newTag,
                    order,
                };
            },
        );
    }

    /**
     * Creates an action thunk that will do an asynchronous request to
     * tag room.
     *
     * @param {MatrixClient} matrixClient the matrix client to set the
     *                                    account data on.
     * @param {Room} room the room to tag.
     * @param {string} oldTag the tag to remove (unless oldTag ==== newTag)
     * @param {string} newTag the tag with which to tag the room.
     * @param {?number} oldIndex the previous position of the room in the
     *                           list of rooms.
     * @param {?number} newIndex the new position of the room in the list
     *                           of rooms.
     * @returns {AsyncActionPayload} an async action payload
     * @see asyncAction
     */
    public static tagUserRoom(
        matrixClient: MatrixClient,
        room: Room,
        oldTag: TagID | null,
        newTag: TagID | null,
        oldIndex?: number,
        newIndex?: number,
    ): AsyncActionPayload {
        let metaData: Parameters<MatrixClient["setRoomTag"]>[2] | null = null;

        // Is the tag ordered manually?
        const store = RoomListStore.instance;
        if (newTag && store.getTagSorting(newTag) === SortAlgorithm.Manual) {
            metaData = {
                order: +this.generateOrderInTag(oldTag, newTag, oldIndex, newIndex),
            };
        }

        return asyncAction(
            "RoomListActions.tagUserRoom",
            () => {
                const promises: Promise<any>[] = [];
                const roomId = room.roomId;

                // Evil hack to get DMs behaving
                if (
                    (oldTag === undefined && newTag === DefaultTagID.DM) ||
                    (oldTag === DefaultTagID.DM && newTag === undefined)
                ) {
                    return Rooms.guessAndSetDMRoom(room, newTag === DefaultTagID.DM).catch((err) => {
                        logger.error("Failed to set DM tag " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("Failed to set direct message tag"),
                            description: err && err.message ? err.message : _t("Operation failed"),
                        });
                    });
                }

                const hasChangedSubLists = oldTag !== newTag;

                // More evilness: We will still be dealing with moving to favourites/low prio,
                // but we avoid ever doing a request with TAG_DM.
                //
                // if we moved lists, remove the old tag
                if (oldTag && oldTag !== DefaultTagID.DM && hasChangedSubLists) {
                    const promiseToDelete = matrixClient.deleteRoomTag(roomId, oldTag).catch(function (err) {
                        logger.error("Failed to remove tag " + oldTag + " from room: " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("Failed to remove tag %(tagName)s from room", { tagName: oldTag }),
                            description: err && err.message ? err.message : _t("Operation failed"),
                        });
                    });

                    promises.push(promiseToDelete);
                }

                // if we moved lists or the ordering changed, add the new tag
                if (newTag && newTag !== DefaultTagID.DM && (hasChangedSubLists || metaData)) {
                    // metaData is the body of the PUT to set the tag, so it must
                    // at least be an empty object.
                    metaData = metaData || ({} as typeof metaData);

                    const promiseToAdd = matrixClient.setRoomTag(roomId, newTag, metaData).catch(function (err) {
                        logger.error("Failed to add tag " + newTag + " to room: " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("Failed to add tag %(tagName)s to room", { tagName: newTag }),
                            description: err && err.message ? err.message : _t("Operation failed"),
                        });

                        throw err;
                    });

                    promises.push(promiseToAdd);
                }

                return Promise.all(promises);
            },
            () => {
                // For an optimistic update
                return {
                    room,
                    oldTag,
                    newTag,
                    metaData,
                };
            },
        );
    }
}
