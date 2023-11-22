/*
Copyright 2016 - 2021 The Matrix.org Foundation C.I.C.

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

import React, { ComponentProps } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { logger } from "matrix-js-sdk/src/logger";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { MatrixClientPeg } from "./MatrixClientPeg";
import MultiInviter, { CompletionStates } from "./utils/MultiInviter";
import Modal from "./Modal";
import { _t } from "./languageHandler";
import InviteDialog from "./components/views/dialogs/invite/InviteDialog";
import ErrorDialog from "./components/views/dialogs/ErrorDialog";
import { InviteKind } from "./components/views/dialogs/invite/InviteDialogTypes";
import { Member } from "./utils/direct-messages";
import InviteErrorDialog from "matrix-react-sdk/src/components/views/dialogs/invite/InviteErrorDialog";
import InviteSuccessDialog from "matrix-react-sdk/src/components/views/dialogs/invite/InviteSuccessDialog";

export interface IInviteResult {
    states: CompletionStates;
    inviter: MultiInviter;
}

/**
 * Invites multiple addresses to a room
 * Simpler interface to utils/MultiInviter but with
 * no option to cancel.
 *
 * @param {string} roomId The ID of the room to invite to
 * @param {string[]} addresses Array of strings of addresses to invite. May be matrix IDs or 3pids.
 * @param {boolean} sendSharedHistoryKeys whether to share e2ee keys with the invitees if applicable.
 * @param {function} progressCallback optional callback, fired after each invite.
 * @returns {Promise} Promise
 */
export function inviteMultipleToRoom(
    roomId: string,
    addresses: string[],
    sendSharedHistoryKeys = false,
    progressCallback?: () => void,
): Promise<IInviteResult> {
    const inviter = new MultiInviter(roomId, progressCallback);
    return inviter
        .invite(addresses, undefined, sendSharedHistoryKeys)
        .then((states) => Promise.resolve({ states, inviter }));
}

export function showStartChatInviteDialog(initialText = ""): void {
    // This dialog handles the room creation internally - we don't need to worry about it.
    Modal.createDialog(
        InviteDialog,
        {
            kind: InviteKind.Dm,
            initialText,
            inviteLimit: 1,
            dialogProps: { title: "发起一个新聊天", description: "" },
            dialogButtonsProps: {
                primaryButton: "发起聊天",
            },
        },
        /*className=*/ "mx_InviteDialog_flexWrapper",
        /*isPriority=*/ false,
        /*isStatic=*/ true,
    );
}

export function showRoomInviteDialog(roomId: string, initialText = ""): void {
    // This dialog handles the room creation internally - we don't need to worry about it.
    Modal.createDialog(
        InviteDialog,
        {
            kind: InviteKind.Invite,
            initialText,
            roomId,
        } as Omit<ComponentProps<typeof InviteDialog>, "onFinished">,
        /*className=*/ "mx_InviteDialog_flexWrapper",
        /*isPriority=*/ false,
        /*isStatic=*/ true,
    );
}

/**
 * Checks if the given MatrixEvent is a valid 3rd party user invite.
 * @param {MatrixEvent} event The event to check
 * @returns {boolean} True if valid, false otherwise
 */
export function isValid3pidInvite(event: MatrixEvent): boolean {
    if (!event || event.getType() !== EventType.RoomThirdPartyInvite) return false;

    // any events without these keys are not valid 3pid invites, so we ignore them
    const requiredKeys = ["key_validity_url", "public_key", "display_name"];
    if (requiredKeys.some((key) => !event.getContent()[key])) {
        return false;
    }

    // Valid enough by our standards
    return true;
}

export function inviteUsersToRoom(
    roomId: string,
    userIds: string[],
    sendSharedHistoryKeys = false,
    progressCallback?: () => void,
): Promise<void> {
    return inviteMultipleToRoom(roomId, userIds, sendSharedHistoryKeys, progressCallback)
        .then((result) => {
            const room = MatrixClientPeg.get().getRoom(roomId)!;
            showAnyInviteErrors(result.states, room, result.inviter);
        })
        .catch((err) => {
            logger.error(err.stack);
            Modal.createDialog(ErrorDialog, {
                title: _t("Failed to invite"),
                description: err && err.message ? err.message : _t("Operation failed"),
            });
        });
}

export function showInviteResult(
    states: CompletionStates,
    room: Room,
    inviter: MultiInviter,
    userMap?: Map<string, Member>,
): boolean {
    // Show user any errors
    const failedUsers = Object.keys(states).filter((a) => states[a] === "error");
    const errorList: string[] = [];
    for (const addr of failedUsers) {
        if (states[addr] === "error") {
            const reason = inviter.getErrorText(addr);
            errorList.push(addr + ": " + reason);
        }
    }

    if (errorList.length > 0) {
        Modal.createDialog(InviteErrorDialog, {
            room,
            inviter,
            userMap,
            failedUsers,
        });
        return false;
    }

    Modal.createDialog(InviteSuccessDialog);
    return true;
}
