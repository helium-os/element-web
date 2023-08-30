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
import { isNullOrUndefined } from "matrix-js-sdk/src/utils";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { M_POLL_START } from "matrix-js-sdk/src/@types/polls";

import { ActionPayload } from "../../dispatcher/payloads";
import { AsyncStoreWithClient } from "../AsyncStoreWithClient";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { MessageEventPreview } from "./previews/MessageEventPreview";
import { PollStartEventPreview } from "./previews/PollStartEventPreview";
import { TagID } from "./models";
import { LegacyCallInviteEventPreview } from "./previews/LegacyCallInviteEventPreview";
import { LegacyCallAnswerEventPreview } from "./previews/LegacyCallAnswerEventPreview";
import { LegacyCallHangupEvent } from "./previews/LegacyCallHangupEvent";
import { StickerEventPreview } from "./previews/StickerEventPreview";
import { ReactionEventPreview } from "./previews/ReactionEventPreview";
import { UPDATE_EVENT } from "../AsyncStore";
import { IPreview } from "./previews/IPreview";
import { VoiceBroadcastInfoEventType } from "../../voice-broadcast";
import { VoiceBroadcastPreview } from "./previews/VoiceBroadcastPreview";

// Emitted event for when a room's preview has changed. First argument will the room for which
// the change happened.
const ROOM_PREVIEW_CHANGED = "room_preview_changed";

const PREVIEWS: Record<
    string,
    {
        isState: boolean;
        previewer: IPreview;
    }
> = {
    "m.room.message": {
        isState: false,
        previewer: new MessageEventPreview(),
    },
    "m.call.invite": {
        isState: false,
        previewer: new LegacyCallInviteEventPreview(),
    },
    "m.call.answer": {
        isState: false,
        previewer: new LegacyCallAnswerEventPreview(),
    },
    "m.call.hangup": {
        isState: false,
        previewer: new LegacyCallHangupEvent(),
    },
    "m.sticker": {
        isState: false,
        previewer: new StickerEventPreview(),
    },
    "m.reaction": {
        isState: false,
        previewer: new ReactionEventPreview(),
    },
    [M_POLL_START.name]: {
        isState: false,
        previewer: new PollStartEventPreview(),
    },
    [M_POLL_START.altName]: {
        isState: false,
        previewer: new PollStartEventPreview(),
    },
    [VoiceBroadcastInfoEventType]: {
        isState: true,
        previewer: new VoiceBroadcastPreview(),
    },
};

// The maximum number of events we're willing to look back on to get a preview.
const MAX_EVENTS_BACKWARDS = 50;

// type merging ftw
type TAG_ANY = "im.vector.any"; // eslint-disable-line @typescript-eslint/naming-convention
const TAG_ANY: TAG_ANY = "im.vector.any";

interface IState {
    // Empty because we don't actually use the state
}

export class MessagePreviewStore extends AsyncStoreWithClient<IState> {
    private static readonly internalInstance = (() => {
        const instance = new MessagePreviewStore();
        instance.start();
        return instance;
    })();

    // null indicates the preview is empty / irrelevant
    private previews = new Map<string, Map<TagID | TAG_ANY, string | null>>();

    private constructor() {
        super(defaultDispatcher, {});
    }

    public static get instance(): MessagePreviewStore {
        return MessagePreviewStore.internalInstance;
    }

    public static getPreviewChangedEventName(room: Room): string {
        return `${ROOM_PREVIEW_CHANGED}:${room?.roomId}`;
    }

    /**
     * Gets the pre-translated preview for a given room
     * @param room The room to get the preview for.
     * @param inTagId The tag ID in which the room resides
     * @returns The preview, or null if none present.
     */
    public async getPreviewForRoom(room: Room, inTagId: TagID): Promise<string | null> {
        if (!room) return null; // invalid room, just return nothing

        if (!this.previews.has(room.roomId)) await this.generatePreview(room, inTagId);

        const previews = this.previews.get(room.roomId);
        if (!previews) return null;

        if (!previews.has(inTagId)) {
            return previews.get(TAG_ANY)!;
        }
        return previews.get(inTagId) ?? null;
    }

    public generatePreviewForEvent(event: MatrixEvent): string {
        const previewDef = PREVIEWS[event.getType()];
        return previewDef?.previewer.getTextFor(event, undefined, true) ?? "";
    }

    private async generatePreview(room: Room, tagId?: TagID): Promise<void> {
        const events = room.timeline;
        if (!events) return; // should only happen in tests

        let map = this.previews.get(room.roomId);
        if (!map) {
            map = new Map<TagID | TAG_ANY, string | null>();
            this.previews.set(room.roomId, map);
        }

        // Set the tags so we know what to generate
        if (!map.has(TAG_ANY)) map.set(TAG_ANY, null);
        if (tagId && !map.has(tagId)) map.set(tagId, null);

        let changed = false;
        for (let i = events.length - 1; i >= 0; i--) {
            if (i === events.length - MAX_EVENTS_BACKWARDS) {
                // limit reached - clear the preview by breaking out of the loop
                break;
            }

            const event = events[i];

            await this.matrixClient.decryptEventIfNeeded(event);

            const previewDef = PREVIEWS[event.getType()];
            if (!previewDef) continue;
            if (previewDef.isState && isNullOrUndefined(event.getStateKey())) continue;

            const anyPreview = previewDef.previewer.getTextFor(event);
            if (!anyPreview) continue; // not previewable for some reason

            changed = changed || anyPreview !== map.get(TAG_ANY);
            map.set(TAG_ANY, anyPreview);

            const tagsToGenerate = Array.from(map.keys()).filter((t) => t !== TAG_ANY); // we did the any tag above
            for (const genTagId of tagsToGenerate) {
                const realTagId = genTagId === TAG_ANY ? undefined : genTagId;
                const preview = previewDef.previewer.getTextFor(event, realTagId);
                if (preview === anyPreview) {
                    changed = changed || anyPreview !== map.get(genTagId);
                    map.delete(genTagId);
                } else {
                    changed = changed || preview !== map.get(genTagId);
                    map.set(genTagId, preview);
                }
            }

            if (changed) {
                // We've muted the underlying Map, so just emit that we've changed.
                this.previews.set(room.roomId, map);
                this.emit(UPDATE_EVENT, this);
                this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
            }
            return; // we're done
        }

        // At this point, we didn't generate a preview so clear it
        this.previews.set(room.roomId, new Map<TagID | TAG_ANY, string | null>());
        this.emit(UPDATE_EVENT, this);
        this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
    }

    protected async onAction(payload: ActionPayload): Promise<void> {
        if (!this.matrixClient) return;

        if (payload.action === "MatrixActions.Room.timeline" || payload.action === "MatrixActions.Event.decrypted") {
            const event = payload.event; // TODO: Type out the dispatcher
            const roomId = event.getRoomId();
            const isHistoricalEvent = payload.hasOwnProperty("isLiveEvent") && !payload.isLiveEvent;

            if (!roomId || !this.previews.has(roomId) || isHistoricalEvent) return;

            const room = this.matrixClient.getRoom(roomId);

            if (!room) return;

            await this.generatePreview(room, TAG_ANY);
        }
    }
}