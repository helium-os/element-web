/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { useContext, useState } from "react";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";
import { IContent, MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";

import { _t } from "../../../languageHandler";
import { CardContext } from "../right_panel/context";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import PosthogTrackers from "../../../PosthogTrackers";
import { useTypedEventEmitter, useTypedEventEmitterState } from "../../../hooks/useEventEmitter";
import RoomContext from "../../../contexts/RoomContext";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";
import MemberAvatar from "../avatars/MemberAvatar";
import { useAsyncMemo } from "../../../hooks/useAsyncMemo";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { Action } from "../../../dispatcher/actions";
import { ShowThreadPayload } from "../../../dispatcher/payloads/ShowThreadPayload";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import MessageTimestamp from "matrix-react-sdk/src/components/views/messages/MessageTimestamp";

interface IProps {
    mxEvent: MatrixEvent;
    thread: Thread;
}

const ThreadSummary: React.FC<IProps> = ({ mxEvent, thread, ...props }) => {
    const cardContext = useContext(CardContext);

    return (
        <AccessibleButton
            {...props}
            className="mx_ThreadSummary"
            onClick={(ev: ButtonEvent) => {
                defaultDispatcher.dispatch<ShowThreadPayload>({
                    action: Action.ShowThread,
                    rootEvent: mxEvent,
                    push: cardContext.isCard,
                });
                PosthogTrackers.trackInteraction("WebRoomTimelineThreadSummaryButton", ev);
            }}
            aria-label={_t("Open thread")}
        >
            <ThreadMessagePreview thread={thread} />
        </AccessibleButton>
    );
};

interface IPreviewProps {
    thread: Thread;
    showTwelveHour?: boolean;
}

export const ThreadMessagePreview: React.FC<IPreviewProps> = ({ thread, showTwelveHour = false }) => {
    const cli = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);

    const showDisplayname = !roomContext.narrow;

    // 消息数
    const count = useTypedEventEmitterState(thread, ThreadEvent.Update, () => thread.length);
    let countSection: string | number = count;
    if (!roomContext.narrow) {
        countSection = _t("%(count)s reply", { count });
    }

    const lastReply = useTypedEventEmitterState(thread, ThreadEvent.Update, () => thread.replyToEvent) ?? undefined;
    // track the content as a means to regenerate the thread message preview upon edits & decryption
    const [content, setContent] = useState<IContent | undefined>(lastReply?.getContent());
    useTypedEventEmitter(lastReply, MatrixEventEvent.Replaced, () => {
        setContent(lastReply!.getContent());
    });

    const lastReplyTime = lastReply?.getTs();

    const awaitDecryption = lastReply?.shouldAttemptDecryption() || lastReply?.isBeingDecrypted();
    useTypedEventEmitter(awaitDecryption ? lastReply : undefined, MatrixEventEvent.Decrypted, () => {
        setContent(lastReply!.getContent());
    });

    const preview = useAsyncMemo(async (): Promise<string | undefined> => {
        if (!lastReply) return;
        await cli.decryptEventIfNeeded(lastReply);
        return MessagePreviewStore.instance.generatePreviewForEvent(lastReply);
    }, [lastReply, content]);

    if (!count || !preview || !lastReply) {
        return null;
    }

    return (
        <>
            <div className="mx_ThreadSummary_mainInfo">
                {lastReply.isDecryptionFailure() ? (
                    <div
                        className="mx_ThreadSummary_content mx_DecryptionFailureBody"
                        title={_t("Unable to decrypt message")}
                    >
                        <span className="mx_ThreadSummary_message-preview">{_t("Unable to decrypt message")}</span>
                    </div>
                ) : (
                    <div className="mx_ThreadSummary_content" title={preview}>
                        <span className="mx_ThreadSummary_message-preview">{preview}</span>
                    </div>
                )}

                <span className="mx_ThreadSummary_replies_amount">{countSection}</span>
                <div className="mx_ThreadSummary_chevron" />
            </div>
            <div className="mx_ThreadSummary_otherInfo">
                <MemberAvatar
                    member={lastReply.sender}
                    fallbackUserId={lastReply.getSender()}
                    width={20}
                    height={20}
                    className="mx_ThreadSummary_avatar"
                />
                {showDisplayname && (
                    <div className="mx_ThreadSummary_sender">{lastReply.sender?.name ?? lastReply.getSender()}</div>
                )}
                <div className="mx_ThreadSummary_lastReplyTime">
                    最后一条消息的时间为{" "}
                    <MessageTimestamp showRelative={true} showTwelveHour={false} ts={lastReplyTime} />
                </div>
            </div>
        </>
    );
};

export default ThreadSummary;
