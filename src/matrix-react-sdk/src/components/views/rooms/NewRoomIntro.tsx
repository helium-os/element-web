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

import React, { useContext } from "react";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { Room } from "matrix-js-sdk/src/models/room";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import DMRoomMap from "../../../utils/DMRoomMap";
import { _t, _td } from "../../../languageHandler";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import RoomAvatar from "../avatars/RoomAvatar";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { showSpaceInvite } from "../../../utils/space";
import EventTileBubble from "../messages/EventTileBubble";
import { ROOM_SECURITY_TAB } from "../dialogs/RoomSettingsDialog";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";
import { privateShouldBeEncrypted } from "../../../utils/rooms";
import { LocalRoom } from "../../../models/LocalRoom";
import { shouldEncryptRoomWithSingle3rdPartyInvite } from "../../../utils/room/shouldEncryptRoomWithSingle3rdPartyInvite";
import RoomAndChannelAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAndChannelAvatar";

function hasExpectedEncryptionSettings(matrixClient: MatrixClient, room: Room): boolean {
    const isEncrypted: boolean = matrixClient.isRoomEncrypted(room.roomId);
    const isPublic: boolean = room.getJoinRule() === "public";
    return isPublic || !privateShouldBeEncrypted() || isEncrypted;
}

const determineIntroMessage = (room: Room, encryptedSingle3rdPartyInvite: boolean): string => {
    if (room instanceof LocalRoom) {
        return _td("Send your first message to invite <displayName/> to chat");
    }

    if (encryptedSingle3rdPartyInvite) {
        return _td("Once everyone has joined, you’ll be able to chat");
    }

    return _td("This is the beginning of your direct message history with <displayName/>.");
};

const AVATAR_SIZE = 70;

const NewRoomIntro: React.FC = () => {
    const cli = useContext(MatrixClientContext);
    const { room, roomId } = useContext(RoomContext);

    if (!room || !roomId) {
        throw new Error("Unable to create a NewRoomIntro without room and roomId");
    }

    const isLocalRoom = room instanceof LocalRoom;
    const dmPartner = isLocalRoom ? room.targets[0]?.userId : DMRoomMap.shared().getUserIdForRoomId(roomId);

    let body: JSX.Element;
    if (dmPartner) {
        const { shouldEncrypt: encryptedSingle3rdPartyInvite } = shouldEncryptRoomWithSingle3rdPartyInvite(room);
        const introMessage = determineIntroMessage(room, encryptedSingle3rdPartyInvite);
        let caption: string | undefined;

        if (
            !(room instanceof LocalRoom) &&
            !encryptedSingle3rdPartyInvite &&
            room.getJoinedMemberCount() + room.getInvitedMemberCount() === 2
        ) {
            // caption = _t("Only the two of you are in this conversation, unless either of you invites anyone to join.");
        }

        const member = room?.getMember(dmPartner);
        const displayName = room?.name || member?.rawDisplayName || dmPartner;
        body = (
            <React.Fragment>
                <div className="mx_NewRoomIntro_roomMainInfo">
                    <RoomAvatar room={room} width={AVATAR_SIZE} height={AVATAR_SIZE} />

                    <p className="mx_NewRoomIntro_roomName">{room.name}</p>
                </div>

                <p className="mx_NewRoomIntro_tips">
                    {_t(
                        introMessage,
                        {},
                        {
                            displayName: () => <b>{displayName}</b>,
                        },
                    )}
                    {caption}
                </p>
            </React.Fragment>
        );
    } else {
        const inRoom = room && room.getMyMembership() === "join";
        const topic = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent()?.topic;
        const canAddTopic = inRoom && room.currentState.maySendStateEvent(EventType.RoomTopic, cli.getSafeUserId());

        const onTopicClick = (): void => {
            defaultDispatcher.dispatch(
                {
                    action: "open_room_settings",
                    room_id: roomId,
                },
                true,
            );
            // focus the topic field to help the user find it as it'll gain an outline
            setImmediate(() => {
                window.document.getElementById("profileTopic")?.focus();
            });
        };

        let topicText;
        if (canAddTopic && topic) {
            topicText = _t(
                "Topic: %(topic)s (<a>edit</a>)",
                { topic },
                {
                    a: (sub) => (
                        <AccessibleButton element="a" kind="link_inline" onClick={onTopicClick}>
                            {sub}
                        </AccessibleButton>
                    ),
                },
            );
        } else if (topic) {
            topicText = _t("Topic: %(topic)s ", { topic });
        } else if (canAddTopic) {
            topicText = _t(
                "<a>Add a topic</a> to help people know what it is about.",
                {},
                {
                    a: (sub) => (
                        <AccessibleButton element="a" kind="link_inline" onClick={onTopicClick}>
                            {sub}
                        </AccessibleButton>
                    ),
                },
            );
        }

        const creator = room.currentState.getStateEvents(EventType.RoomCreate, "")?.getSender();
        const creatorName = (creator && room?.getMember(creator)?.rawDisplayName) || creator;

        let createdText: string;
        if (creator === cli.getUserId()) {
            createdText = _t("You created this room.");
        } else {
            createdText = _t("%(displayName)s created this room.", {
                displayName: creatorName,
            });
        }

        let parentSpace: Room | undefined;
        if (
            SpaceStore.instance.activeSpaceRoom?.canInvite(cli.getSafeUserId()) &&
            SpaceStore.instance.isRoomInSpace(SpaceStore.instance.activeSpace!, room.roomId)
        ) {
            parentSpace = SpaceStore.instance.activeSpaceRoom;
        }

        const showJustInviteToRoom = false;
        const showInviteToSpace = false;

        let buttons: JSX.Element | undefined;
        if (parentSpace && shouldShowComponent(UIComponent.InviteUsers)) {
            let inviteToSpaceBtn;
            if (showInviteToSpace) {
                inviteToSpaceBtn = (
                    <AccessibleButton
                        className="mx_NewRoomIntro_inviteButton"
                        kind="primary"
                        onClick={() => {
                            showSpaceInvite(parentSpace!);
                        }}
                    >
                        {_t("Invite to %(spaceName)s", { spaceName: parentSpace.name })}
                    </AccessibleButton>
                );
            }

            let justInviteToRoomBtn;
            if (showJustInviteToRoom && room.canInvite(cli.getSafeUserId())) {
                justInviteToRoomBtn = (
                    <AccessibleButton
                        className="mx_NewRoomIntro_inviteButton"
                        kind="primary_outline"
                        onClick={() => {
                            defaultDispatcher.dispatch({ action: "view_invite", roomId });
                        }}
                    >
                        {_t("Invite to just this room")}
                    </AccessibleButton>
                );
            }

            if (inviteToSpaceBtn || justInviteToRoomBtn) {
                buttons = (
                    <div className="mx_NewRoomIntro_buttons">
                        {inviteToSpaceBtn}
                        {justInviteToRoomBtn}
                    </div>
                );
            }
        } else if (room.canInvite(cli.getSafeUserId()) && shouldShowComponent(UIComponent.InviteUsers)) {
            buttons = (
                <div className="mx_NewRoomIntro_buttons">
                    <AccessibleButton
                        className="mx_NewRoomIntro_inviteButton"
                        kind="primary"
                        onClick={() => {
                            defaultDispatcher.dispatch({ action: "view_invite", roomId });
                        }}
                    >
                        {_t("Invite people")}
                    </AccessibleButton>
                </div>
            );
        }

        const avatar = <RoomAndChannelAvatar room={room} avatarSize={AVATAR_SIZE} />;

        body = (
            <React.Fragment>
                <div className="mx_NewRoomIntro_roomMainInfo">
                    {avatar}
                    <p className="mx_NewRoomIntro_roomName">{room.name}</p>
                </div>

                <p className="mx_NewRoomIntro_tips">
                    {createdText}{" "}
                    {_t(
                        "This is the start of <roomName/>.",
                        {},
                        {
                            roomName: () => <b>{room.name}</b>,
                        },
                    )}
                </p>
                {/*<p>{topicText}</p>*/}
                {buttons}
            </React.Fragment>
        );
    }

    function openRoomSettings(event: ButtonEvent): void {
        event.preventDefault();
        defaultDispatcher.dispatch({
            action: "open_room_settings",
            initial_tab_id: ROOM_SECURITY_TAB,
        });
    }

    const subText = _t(
        "Your private messages are normally encrypted, but this room isn't. " +
            "Usually this is due to an unsupported device or method being used, " +
            "like email invites.",
    );

    let subButton;
    if (room.currentState.mayClientSendStateEvent(EventType.RoomEncryption, MatrixClientPeg.get()) && !isLocalRoom) {
        subButton = (
            <AccessibleButton kind="link_inline" onClick={openRoomSettings}>
                {_t("Enable encryption in settings.")}
            </AccessibleButton>
        );
    }

    const subtitle = (
        <span>
            {" "}
            {subText} {subButton}{" "}
        </span>
    );

    return (
        <li className="mx_NewRoomIntro">
            {!hasExpectedEncryptionSettings(cli, room) && (
                <EventTileBubble
                    className="mx_cryptoEvent mx_cryptoEvent_icon_warning"
                    title={_t("End-to-end encryption isn't enabled")}
                    subtitle={subtitle}
                />
            )}

            {body}
        </li>
    );
};

export default NewRoomIntro;
