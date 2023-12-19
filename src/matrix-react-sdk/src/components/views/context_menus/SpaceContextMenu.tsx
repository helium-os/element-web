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
import { Room } from "matrix-js-sdk/src/models/room";

import { ContextMenuProps as IContextMenuProps } from "../../structures/ContextMenu";
import IconizedContextMenu, { IconizedContextMenuOption, IconizedContextMenuOptionList } from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";
import {
    shouldShowSpaceSettings,
    showSpaceInvite,
    showSpacePreferences,
    showSpaceSettings,
} from "../../../utils/space";
import { leaveSpace } from "../../../utils/leave-behaviour";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { ButtonEvent } from "../elements/AccessibleButton";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import SettingsStore from "../../../settings/SettingsStore";
import { Action } from "../../../dispatcher/actions";
import PosthogTrackers from "../../../PosthogTrackers";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import SpaceAddTagContextMenu from "matrix-react-sdk/src/components/views/context_menus/SpaceAddTagContextMenu";
import SpaceAddChanelContextMenu from "matrix-react-sdk/src/components/views/context_menus/SpaceAddChannelContextMenu";

interface IProps extends IContextMenuProps {
    space: Room;
    hideHeader?: boolean;
}

const SpaceContextMenu: React.FC<IProps> = ({ space, hideHeader, onFinished, ...props }) => {
    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;

    let inviteOption: JSX.Element | null = null;
    if (space.getMyMembership() === "join" && (space.getJoinRule() === "public" || space.canInvite(userId))) {
        const onInviteClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            showSpaceInvite(space);
            onFinished();
        };

        inviteOption = (
            <IconizedContextMenuOption
                data-testid="invite-option"
                className="mx_SpacePanel_contextMenu_inviteButton"
                iconClassName="mx_SpacePanel_iconInvite"
                label={_t("Invite people")}
                onClick={onInviteClick}
            />
        );
    }

    let settingsOption: JSX.Element | null = null;
    let leaveOption: JSX.Element | null = null;
    if (shouldShowSpaceSettings(space)) {
        const onSettingsClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            showSpaceSettings(space);
            onFinished();
        };

        settingsOption = (
            <IconizedContextMenuOption
                data-testid="settings-option"
                iconClassName="mx_SpacePanel_iconSettings"
                label={_t("Settings")}
                onClick={onSettingsClick}
            />
        );
    } else {
        const onLeaveClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            leaveSpace(space);
            onFinished();
        };

        leaveOption = (
            <IconizedContextMenuOption
                data-testid="leave-option"
                iconClassName="mx_SpacePanel_iconLeave"
                className="mx_IconizedContextMenu_option_red"
                label={_t("Leave space")}
                onClick={onLeaveClick}
            />
        );
    }

    let devtoolsOption: JSX.Element | null = null;
    if (SettingsStore.getValue("developerMode")) {
        const onViewTimelineClick = (ev: ButtonEvent): void => {
            ev.preventDefault();
            ev.stopPropagation();

            defaultDispatcher.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: space.roomId,
                forceTimeline: true,
                metricsTrigger: undefined, // room doesn't change
            });
            onFinished();
        };

        devtoolsOption = (
            <IconizedContextMenuOption
                iconClassName="mx_SpacePanel_iconSettings"
                label={_t("See room timeline (devtools)")}
                onClick={onViewTimelineClick}
            />
        );
    }

    const onPreferencesClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        showSpacePreferences(space);
        onFinished();
    };

    const openSpace = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: space.roomId,
            metricsTrigger: undefined, // other
        });
        onFinished();
    };

    const onExploreRoomsClick = (ev: ButtonEvent): void => {
        PosthogTrackers.trackInteraction("WebSpaceContextMenuExploreRoomsItem", ev);
        openSpace(ev);
    };

    return (
        <IconizedContextMenu {...props} onFinished={onFinished} className="mx_SpacePanel_contextMenu" compact>
            {!hideHeader && <div className="mx_SpacePanel_contextMenu_header">{space.name}</div>}
            <IconizedContextMenuOptionList first>
                {inviteOption}
                {/*<IconizedContextMenuOption*/}
                {/*    iconClassName="mx_SpacePanel_iconExplore"*/}
                {/*    label={canAddRooms ? _t("Manage & explore rooms") : _t("Explore rooms")}*/}
                {/*    onClick={onExploreRoomsClick}*/}
                {/*/>*/}
                {/*<IconizedContextMenuOption*/}
                {/*    iconClassName="mx_SpacePanel_iconPreferences"*/}
                {/*    label={_t("Preferences")}*/}
                {/*    onClick={onPreferencesClick}*/}
                {/*/>*/}
                <SpaceAddChanelContextMenu showIcon={true} />
                <SpaceAddTagContextMenu showIcon={true} />

                {settingsOption && <hr />}
                {/*{devtoolsOption}*/}
                {settingsOption}
                {/*{leaveOption}*/}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
    );
};

export default SpaceContextMenu;
