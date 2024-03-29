/*
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

import { Room } from "matrix-js-sdk/src/models/room";

import { SortAlgorithm } from "../models";
import { sortRoomsWithAlgorithm } from "../tag-sorting";
import { OrderingAlgorithm } from "./OrderingAlgorithm";
import { RoomUpdateCause, TagID } from "../../models";

/**
 * Uses the natural tag sorting algorithm order to determine tag ordering. No
 * additional behavioural changes are present.
 */
export class NaturalAlgorithm extends OrderingAlgorithm {
    public constructor(tagId: TagID, initialSortingAlgorithm: SortAlgorithm) {
        super(tagId, initialSortingAlgorithm);
    }

    public setRooms(rooms: Room[]): void {
        this.cachedOrderedRooms = sortRoomsWithAlgorithm(rooms, this.tagId, this.sortingAlgorithm);
    }

    public handleRoomUpdate(room: Room, cause: RoomUpdateCause): boolean {
        const isSplice = [
            RoomUpdateCause.NewRoom,
            RoomUpdateCause.RoomRemoved,
            RoomUpdateCause.RoomOrderInTagChange,
        ].includes(cause);
        const isInPlace = cause === RoomUpdateCause.Timeline || cause === RoomUpdateCause.ReadReceipt;
        if (!isSplice && !isInPlace) {
            throw new Error(`Unsupported update cause: ${cause}`);
        }

        switch (cause) {
            case RoomUpdateCause.NewRoom:
                {
                    this.cachedOrderedRooms.push(room);
                }
                break;
            case RoomUpdateCause.RoomRemoved:
                {
                    const idx = this.getRoomIndex(room);
                    if (idx >= 0) {
                        this.cachedOrderedRooms.splice(idx, 1);
                    } else {
                        console.warn(`Tried to remove unknown room from ${this.tagId}: ${room.roomId}`);
                    }
                }
                break;
            case RoomUpdateCause.RoomOrderInTagChange:
                {
                    const idx = this.getRoomIndex(room);
                    if (idx >= 0) {
                        this.cachedOrderedRooms.splice(idx, 1, room);
                    } else {
                        console.warn(`Tried to change unknown room from ${this.tagId}: ${room.roomId}`);
                    }
                }
                break;
        }

        // TODO: Optimize this to avoid useless operations: https://github.com/vector-im/element-web/issues/14457
        // For example, we can skip updates to alphabetic (sometimes) and manually ordered tags
        this.cachedOrderedRooms = sortRoomsWithAlgorithm(this.cachedOrderedRooms, this.tagId, this.sortingAlgorithm);

        return true;
    }
}
