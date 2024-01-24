/*
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

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
import { isNullOrUndefined } from "matrix-js-sdk/src/utils";
import { EventEmitter } from "events";
import { logger } from "matrix-js-sdk/src/logger";

import DMRoomMap from "../../../utils/DMRoomMap";
import { arrayDiff, arrayHasDiff } from "../../../utils/arrays";
import { DefaultTagID, RoomUpdateCause, TagID } from "../models";
import {
    IListOrderingMap,
    IOrderingAlgorithmMap,
    ITagMap,
    ITagSortingMap,
    ListAlgorithm,
    SortAlgorithm,
} from "./models";
import { EffectiveMembership, getEffectiveMembership, splitRoomsByMembership } from "../../../utils/membership";
import { OrderingAlgorithm } from "./list-ordering/OrderingAlgorithm";
import { getListAlgorithmInstance } from "./list-ordering";
import { CallStore, CallStoreEvent } from "../../CallStore";

/**
 * Fired when the Algorithm has determined a list has been updated.
 */
export const LIST_UPDATED_EVENT = "list_updated_event";

// These are the causes which require a room to be known in order for us to handle them. If
// a cause in this list is raised and we don't know about the room, we don't handle the update.
//
// Note: these typically happen when a new room is coming in, such as the user creating or
// joining the room. For these cases, we need to know about the room prior to handling it otherwise
// we'll make bad assumptions.
const CAUSES_REQUIRING_ROOM = [RoomUpdateCause.Timeline, RoomUpdateCause.ReadReceipt];

/**
 * Represents a list ordering algorithm. This class will take care of tag
 * management (which rooms go in which tags) and ask the implementation to
 * deal with ordering mechanics.
 */
export class Algorithm extends EventEmitter {
    private _cachedRooms: ITagMap = {};
    private sortAlgorithms: ITagSortingMap | null = null;
    private listAlgorithms: IListOrderingMap | null = null;
    private algorithms: IOrderingAlgorithmMap | null = null;
    private rooms: Room[] = [];
    private roomIdsToTags: {
        [roomId: string]: TagID[];
    } = {};

    /**
     * Set to true to suspend emissions of algorithm updates.
     */
    public updatesInhibited = false;

    public start(): void {
        CallStore.instance.on(CallStoreEvent.ActiveCalls, this.onActiveCalls);
    }

    public stop(): void {
        CallStore.instance.off(CallStoreEvent.ActiveCalls, this.onActiveCalls);
    }

    public get knownRooms(): Room[] {
        return this.rooms;
    }

    public get hasTagSortingMap(): boolean {
        return !!this.sortAlgorithms;
    }

    protected set cachedRooms(val: ITagMap) {
        this._cachedRooms = val;
        this.recalculateActiveCallRooms();
    }

    protected get cachedRooms(): ITagMap {
        return this._cachedRooms;
    }

    public getTagSorting(tagId: TagID): SortAlgorithm | null {
        if (!this.sortAlgorithms) return null;
        return this.sortAlgorithms[tagId];
    }

    public setTagSorting(tagId: TagID, sort: SortAlgorithm): void {
        if (!tagId) throw new Error("Tag ID must be defined");
        if (!sort) throw new Error("Algorithm must be defined");
        if (!this.sortAlgorithms) throw new Error("this.sortAlgorithms must be defined before calling setTagSorting");
        if (!this.algorithms) throw new Error("this.algorithms must be defined before calling setTagSorting");
        this.sortAlgorithms[tagId] = sort;

        const algorithm: OrderingAlgorithm = this.algorithms[tagId];
        algorithm.setSortAlgorithm(sort);

        this._cachedRooms[tagId] = algorithm.orderedRooms;
        this.recalculateActiveCallRooms(tagId);
    }

    public getListOrdering(tagId: TagID): ListAlgorithm | null {
        if (!this.listAlgorithms) return null;
        return this.listAlgorithms[tagId];
    }

    public setListOrdering(tagId: TagID, order: ListAlgorithm): void {
        if (!tagId) throw new Error("Tag ID must be defined");
        if (!order) throw new Error("Algorithm must be defined");
        if (!this.sortAlgorithms) throw new Error("this.sortAlgorithms must be defined before calling setListOrdering");
        if (!this.listAlgorithms) throw new Error("this.listAlgorithms must be defined before calling setListOrdering");
        if (!this.algorithms) throw new Error("this.algorithms must be defined before calling setListOrdering");
        this.listAlgorithms[tagId] = order;

        const algorithm = getListAlgorithmInstance(order, tagId, this.sortAlgorithms[tagId]);
        this.algorithms[tagId] = algorithm;

        algorithm.setRooms(this._cachedRooms[tagId]);

        this._cachedRooms[tagId] = algorithm.orderedRooms;
        this.recalculateActiveCallRooms(tagId);
    }

    private onActiveCalls = (): void => {
        // Update the stickiness of rooms with calls
        this.recalculateActiveCallRooms();

        if (this.updatesInhibited) return;
        // This isn't in response to any particular RoomListStore update,
        // so notify the store that it needs to force-update
        this.emit(LIST_UPDATED_EVENT, true);
    };

    /**
     * Recalculate the position of any rooms with calls. If this is being called in
     * relation to a specific tag being updated, it should be given to this function to
     * optimize the call.
     *
     * This expects to be called *after* the sticky rooms are updated, and sticks the
     * room with the currently active call to the top of its tag.
     *
     * @param updatedTag The tag that was updated, if possible.
     */
    protected recalculateActiveCallRooms(updatedTag: TagID | null = null): void {
        if (!updatedTag) {
            // Assume all tags need updating
            // We're not modifying the map here, so can safely rely on the cached values
            // rather than the explicitly sticky map.
            for (const tagId of Object.keys(this.cachedRooms)) {
                if (!tagId) {
                    throw new Error("Unexpected recursion: falsy tag");
                }
                this.recalculateActiveCallRooms(tagId);
            }
            return;
        }

        if (CallStore.instance.activeCalls.size) {
            const rooms = this._cachedRooms![updatedTag];

            const activeRoomIds = new Set([...CallStore.instance.activeCalls].map((call) => call.roomId));
            const activeRooms: Room[] = [];
            const inactiveRooms: Room[] = [];

            for (const room of rooms) {
                (activeRoomIds.has(room.roomId) ? activeRooms : inactiveRooms).push(room);
            }

            this._cachedRooms![updatedTag] = [...activeRooms, ...inactiveRooms];
        }
    }

    /**
     * Asks the Algorithm to regenerate all lists, using the tags given
     * as reference for which lists to generate and which way to generate
     * them.
     * @param {ITagSortingMap} tagSortingMap The tags to generate.
     * @param {IListOrderingMap} listOrderingMap The ordering of those tags.
     */
    public populateTags(tagSortingMap: ITagSortingMap, listOrderingMap: IListOrderingMap): void {
        if (!tagSortingMap) throw new Error(`Sorting map cannot be null or empty`);
        if (!listOrderingMap) throw new Error(`Ordering ma cannot be null or empty`);
        if (arrayHasDiff(Object.keys(tagSortingMap), Object.keys(listOrderingMap))) {
            throw new Error(`Both maps must contain the exact same tags`);
        }
        this.sortAlgorithms = tagSortingMap;
        this.listAlgorithms = listOrderingMap;
        this.algorithms = {};
        for (const tag of Object.keys(tagSortingMap)) {
            this.algorithms[tag] = getListAlgorithmInstance(this.listAlgorithms[tag], tag, this.sortAlgorithms[tag]);
        }

        return this.setKnownRooms(this.rooms);
    }

    /**
     * Gets an ordered set of rooms for the all known tags.
     * @returns {ITagMap} The cached list of rooms, ordered,
     * for each tag. May be empty, but never null/undefined.
     */
    public getOrderedRooms(): ITagMap {
        return this.cachedRooms;
    }

    /**
     * Seeds the Algorithm with a set of rooms. The algorithm will discard all
     * previously known information and instead use these rooms instead.
     * @param {Room[]} rooms The rooms to force the algorithm to use.
     */
    public setKnownRooms(rooms: Room[]): void {
        if (isNullOrUndefined(rooms)) throw new Error(`Array of rooms cannot be null`);
        if (!this.sortAlgorithms) throw new Error(`Cannot set known rooms without a tag sorting map`);

        if (!this.updatesInhibited) {
            // We only log this if we're expecting to be publishing updates, which means that
            // this could be an unexpected invocation. If we're inhibited, then this is probably
            // an intentional invocation.
            logger.warn("Resetting known rooms, initiating regeneration");
        }

        this.rooms = rooms;

        const newTags: ITagMap = {};
        for (const tagId in this.sortAlgorithms) {
            // noinspection JSUnfilteredForInLoop
            newTags[tagId] = [];
        }

        // If we can avoid doing work, do so.
        if (!rooms.length) {
            this.generateFreshTags(newTags); // just in case it wants to do something
            this.cachedRooms = newTags;
            return;
        }

        // Split out the easy rooms first (leave and invite)
        const memberships = splitRoomsByMembership(rooms);

        for (const room of memberships[EffectiveMembership.Invite]) {
            newTags[DefaultTagID.Invite].push(room);
        }
        for (const room of memberships[EffectiveMembership.Leave]) {
            newTags[DefaultTagID.Archived].push(room);
        }

        // Now process all the joined rooms. This is a bit more complicated
        for (const room of memberships[EffectiveMembership.Join]) {
            const tags = this.getTagsOfJoinedRoom(room);

            let inTag = false;
            if (tags.length > 0) {
                for (const tag of tags) {
                    if (!isNullOrUndefined(newTags[tag])) {
                        newTags[tag].push(room);
                        inTag = true;
                    }
                }
            }

            if (!inTag) {
                if (DMRoomMap.shared().getUserIdForRoomId(room.roomId)) {
                    newTags[DefaultTagID.DM].push(room);
                } else {
                    newTags[DefaultTagID.Untagged].push(room);
                }
            }
        }

        // 对room进行排序
        this.generateFreshTags(newTags);

        this.cachedRooms = newTags; // this recalculates the filtered rooms for us

        this.updateTagsFromCache();
    }

    public getTagsForRoom(room: Room): TagID[] {
        const tags: TagID[] = [];

        const membership = getEffectiveMembership(room.getMyMembership());
        if (membership === EffectiveMembership.Invite) {
            tags.push(DefaultTagID.Invite);
        } else if (membership === EffectiveMembership.Leave) {
            tags.push(DefaultTagID.Archived);
        } else {
            tags.push(...this.getTagsOfJoinedRoom(room));
        }

        if (!tags.length) tags.push(DefaultTagID.Untagged);

        return tags;
    }

    private getTagsOfJoinedRoom(room: Room): TagID[] {
        const roomTags = room.getAllTags();
        let tagIds: TagID[] = roomTags.map((item) => item.tagId).filter((tagId) => !!tagId);

        if (tagIds.length === 0) {
            // Check to see if it's a DM if it isn't anything else
            if (DMRoomMap.shared().getUserIdForRoomId(room.roomId)) {
                tagIds = [DefaultTagID.DM];
            }
        }

        return tagIds;
    }

    /**
     * Updates the roomsToTags map
     */
    private updateTagsFromCache(): void {
        const newMap: Algorithm["roomIdsToTags"] = {};

        const tags = Object.keys(this.cachedRooms);
        for (const tagId of tags) {
            const rooms = this.cachedRooms[tagId];
            for (const room of rooms) {
                if (!newMap[room.roomId]) newMap[room.roomId] = [];
                newMap[room.roomId].push(tagId);
            }
        }

        this.roomIdsToTags = newMap;
    }

    /**
     * Called when the Algorithm believes a complete regeneration of the existing
     * lists is needed.
     * @param {ITagMap} updatedTagMap The tag map which needs populating. Each tag
     * will already have the rooms which belong to it - they just need ordering. Must
     * be mutated in place.
     */
    private generateFreshTags(updatedTagMap: ITagMap): void {
        if (!this.algorithms) throw new Error("Not ready: no algorithms to determine tags from");

        for (const tag of Object.keys(updatedTagMap)) {
            const algorithm: OrderingAlgorithm = this.algorithms[tag];
            if (!algorithm) throw new Error(`No algorithm for ${tag}`);

            algorithm.setRooms(updatedTagMap[tag]);
            updatedTagMap[tag] = algorithm.orderedRooms;
        }
    }

    /**
     * Asks the Algorithm to update its knowledge of a room. For example, when
     * a user tags a room, joins/creates a room, or leaves a room the Algorithm
     * should be told that the room's info might have changed. The Algorithm
     * may no-op this request if no changes are required.
     * @param {Room} room The room which might have affected sorting.
     * @param {RoomUpdateCause} cause The reason for the update being triggered.
     * @returns {Promise<boolean>} A boolean of whether or not getOrderedRooms()
     * should be called after processing.
     */
    public handleRoomUpdate(room: Room, cause: RoomUpdateCause): boolean {
        if (!this.algorithms) throw new Error("Not ready: no algorithms to determine tags from");

        if (cause === RoomUpdateCause.NewRoom) {
            const roomTags = this.roomIdsToTags[room.roomId];
            const hasTags = roomTags && roomTags.length > 0;

            // pass the cause through as NewRoom, we'll fail to lie to the algorithm and thus
            // lose the room.
            if (hasTags) {
                logger.warn(`${room.roomId} is reportedly new but is already known - assuming TagChange instead`);
                cause = RoomUpdateCause.PossibleTagChange;
            }

            // Check to see if the room is known first
            let knownRoomRef = this.rooms.includes(room);
            if (hasTags && !knownRoomRef) {
                logger.warn(`${room.roomId} might be a reference change - attempting to update reference`);
                this.rooms = this.rooms.map((r) => (r.roomId === room.roomId ? room : r));
                knownRoomRef = this.rooms.includes(room);
                if (!knownRoomRef) {
                    logger.warn(`${room.roomId} is still not referenced. It may be sticky.`);
                }
            }

            // If we have tags for a room and don't have the room referenced, something went horribly
            // wrong - the reference should have been updated above.
            if (hasTags && !knownRoomRef) {
                throw new Error(`${room.roomId} is missing from room array but is known - trying to find duplicate`);
            }

            // If after all that we're still a NewRoom update, add the room if applicable.
            // We don't do this for the sticky room (because it causes duplication issues)
            // or if we know about the reference (as it should be replaced).
            if (cause === RoomUpdateCause.NewRoom && !knownRoomRef) {
                this.rooms.push(room);
            }
        }

        let didTagChange = false;
        if (cause === RoomUpdateCause.PossibleTagChange) {
            const oldTags = this.roomIdsToTags[room.roomId] || [];
            const newTags = this.getTagsForRoom(room);
            const diff = arrayDiff(oldTags, newTags);
            if (diff.removed.length > 0 || diff.added.length > 0) {
                // room移除tag
                for (const rmTag of diff.removed) {
                    const algorithm: OrderingAlgorithm = this.algorithms[rmTag];
                    if (!algorithm) throw new Error(`No algorithm for ${rmTag}`);
                    algorithm.handleRoomUpdate(room, RoomUpdateCause.RoomRemoved);

                    this._cachedRooms[rmTag] = algorithm.orderedRooms;
                    this.recalculateActiveCallRooms(rmTag);
                }
                // room新增tag
                for (const addTag of diff.added) {
                    const algorithm: OrderingAlgorithm = this.algorithms[addTag];
                    if (!algorithm) throw new Error(`No algorithm for ${addTag}`);
                    algorithm.handleRoomUpdate(room, RoomUpdateCause.NewRoom);

                    this._cachedRooms[addTag] = algorithm.orderedRooms;
                }

                cause = RoomUpdateCause.Timeline;
                didTagChange = true;
            } else {
                // order in tag change
                for (const tag of newTags) {
                    const algorithm: OrderingAlgorithm = this.algorithms[tag];
                    if (!algorithm) throw new Error(`No algorithm for ${tag}`);

                    if (this.getTagSorting(tag) !== SortAlgorithm.Manual) continue; // 非手动排序不做处理

                    algorithm.handleRoomUpdate(room, RoomUpdateCause.RoomOrderInTagChange);
                    this._cachedRooms[tag] = algorithm.orderedRooms;
                    this.recalculateActiveCallRooms(tag);

                    cause = RoomUpdateCause.Timeline;
                    didTagChange = true;
                }
            }

            if (!didTagChange) {
                return false;
            }
            // Update the tag map so we don't regen it in a moment
            this.roomIdsToTags[room.roomId] = newTags;
        }

        if (!this.roomIdsToTags[room.roomId]) {
            if (CAUSES_REQUIRING_ROOM.includes(cause)) {
                return false;
            }

            // Get the tags for the room and populate the cache
            const roomTags = this.getTagsForRoom(room).filter((t) => !isNullOrUndefined(this.cachedRooms[t]));

            // "This should never happen" condition - we specify DefaultTagID.Untagged in getTagsForRoom(),
            // which means we should *always* have a tag to go off of.
            if (!roomTags.length) throw new Error(`Tags cannot be determined for ${room.roomId}`);

            this.roomIdsToTags[room.roomId] = roomTags;
        }

        const tags = this.roomIdsToTags[room.roomId];
        if (!tags) {
            logger.warn(`No tags known for "${room.name}" (${room.roomId})`);
            return false;
        }

        let changed = didTagChange;
        for (const tag of tags) {
            const algorithm: OrderingAlgorithm = this.algorithms[tag];
            if (!algorithm) throw new Error(`No algorithm for ${tag}`);

            algorithm.handleRoomUpdate(room, cause);
            this._cachedRooms[tag] = algorithm.orderedRooms;

            // Flag that we've done something
            this.recalculateActiveCallRooms(tag);
            changed = true;
        }

        return changed;
    }
}
