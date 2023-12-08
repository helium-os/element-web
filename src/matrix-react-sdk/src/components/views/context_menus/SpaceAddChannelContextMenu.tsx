/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { EventType, RoomType } from "matrix-js-sdk/src/@types/event";

import { ContextMenuProps } from "../../structures/ContextMenu";
import { IconizedContextMenuOption } from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";
import { showAddExistingRooms, showCreateNewRoom, showCreateNewSubspace } from "../../../utils/space";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { ButtonEvent } from "../elements/AccessibleButton";
import { BetaPill } from "../beta/BetaCard";
import SettingsStore from "../../../settings/SettingsStore";
import { useFeatureEnabled } from "../../../hooks/useSettings";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { Tag, TagID } from "matrix-react-sdk/src/stores/room-list/models";
import { Room } from "matrix-js-sdk/src/models/room";

interface IProps extends ContextMenuProps {
    showIcon?: boolean;
    tagId?: TagID;
}

export const onCreateRoom = (spaceRoom: Room, roomType?: RoomType, tags?: Tag[]) => {
    showCreateNewRoom(spaceRoom, roomType, tags);
};

const SpaceAddChanelContextMenu: React.FC<IProps> = ({ tagId, showIcon = false }) => {
    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;

    const activeSpaceRoom = SpaceStore.instance.activeSpaceRoom;

    const videoRoomsEnabled = useFeatureEnabled("feature_video_rooms");
    const elementCallVideoRoomsEnabled = useFeatureEnabled("feature_element_call_video_rooms");

    const hasPermissionToAddSpaceChild = activeSpaceRoom?.currentState.maySendStateEvent(EventType.SpaceChild, userId);
    const canAddRooms =
        activeSpaceRoom.getMyMembership() === "join" &&
        hasPermissionToAddSpaceChild &&
        shouldShowComponent(UIComponent.CreateRooms);
    const canAddVideoRooms = canAddRooms && videoRoomsEnabled;
    const canAddSubSpaces =
        SettingsStore.getValue("Spaces.addSubSpace") &&
        hasPermissionToAddSpaceChild &&
        shouldShowComponent(UIComponent.CreateSpaces);

    let newRoomSection: JSX.Element | null = null;
    if (canAddRooms || canAddSubSpaces) {
        let tags;
        if (tagId) tags = [{ tagId }];

        const onNewRoomClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            onCreateRoom(activeSpaceRoom, undefined, tags);
        };

        const onNewVideoRoomClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            onCreateRoom(
                activeSpaceRoom,
                elementCallVideoRoomsEnabled ? RoomType.UnstableCall : RoomType.ElementVideo,
                tags,
            );
        };

        const onNewSubspaceClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            showCreateNewSubspace(activeSpaceRoom);
        };

        const onAddExistingRoomClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            showAddExistingRooms(activeSpaceRoom);
        };

        const iconClassName = showIcon ? "mx_SpacePanel_iconAddChannel" : "";

        newRoomSection = (
            <>
                {canAddRooms && (
                    <IconizedContextMenuOption
                        data-testid="new-room-option"
                        iconClassName={iconClassName}
                        label={_t("Create room", { roomType: _t("channel") })}
                        onClick={onNewRoomClick}
                    />
                )}
                {canAddVideoRooms && (
                    <IconizedContextMenuOption
                        data-testid="new-video-room-option"
                        iconClassName={iconClassName}
                        label={_t("Create video room")}
                        onClick={onNewVideoRoomClick}
                    >
                        <BetaPill />
                    </IconizedContextMenuOption>
                )}
                {activeSpaceRoom && (
                    <>
                        {canAddSubSpaces && (
                            <IconizedContextMenuOption
                                data-testid="new-subspace-option"
                                iconClassName={iconClassName}
                                label={_t("Space")}
                                onClick={onNewSubspaceClick}
                            >
                                <BetaPill />
                            </IconizedContextMenuOption>
                        )}
                        {SettingsStore.getValue("Spaces.addExistingRoom") && (
                            <IconizedContextMenuOption
                                label={_t("Add existing room")}
                                iconClassName={showIcon ? "mx_RoomList_iconAddExistingRoom" : ""}
                                onClick={onAddExistingRoomClick}
                            />
                        )}
                    </>
                )}
            </>
        );
    }

    return <>{newRoomSection}</>;
};

export default SpaceAddChanelContextMenu;
