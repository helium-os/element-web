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

import React, { useMemo, useContext, memo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";

import { ContextMenuProps as IContextMenuProps } from "../../structures/ContextMenu";
import IconizedContextMenu, { IconizedContextMenuOption, IconizedContextMenuOptionList } from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";
import { showSpaceInvite, showSpaceSettings } from "../../../utils/space";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { ButtonEvent } from "../elements/AccessibleButton";
import SpaceAddTagContextMenu from "matrix-react-sdk/src/components/views/context_menus/SpaceAddTagContextMenu";
import SpaceAddChanelContextMenu from "matrix-react-sdk/src/components/views/context_menus/SpaceAddChannelContextMenu";
import useRoomPermissions from "matrix-react-sdk/src/hooks/room/useRoomPermissions";
import { StateEventType } from "matrix-react-sdk/src/powerLevel";

interface IProps extends IContextMenuProps {
    space: Room;
    hideHeader?: boolean;
}

const SpaceContextMenu: React.FC<IProps> = ({ space, hideHeader, onFinished, ...props }) => {
    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;

    const [canInvite] = useRoomPermissions(
        cli,
        space,
        useMemo(
            () => [
                {
                    eventType: StateEventType.Invite,
                    state: true,
                },
            ],
            [],
        ),
        userId,
    );

    let inviteOption: JSX.Element | null = null;
    if (canInvite) {
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
    const onSettingsClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();

        showSpaceSettings(space);
        onFinished();
    };

    const settingsOption = (
        <IconizedContextMenuOption
            data-testid="settings-option"
            iconClassName="mx_SpacePanel_iconSettings"
            label={_t("Settings")}
            onClick={onSettingsClick}
        />
    );

    return (
        <IconizedContextMenu {...props} onFinished={onFinished} className="mx_SpacePanel_contextMenu" compact>
            {!hideHeader && <div className="mx_SpacePanel_contextMenu_header">{space.name}</div>}
            <IconizedContextMenuOptionList first>
                {inviteOption}
                <SpaceAddChanelContextMenu showIcon={true} />
                <SpaceAddTagContextMenu showIcon={true} />

                {settingsOption && <hr />}
                {settingsOption}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
    );
};

export default memo(SpaceContextMenu);
