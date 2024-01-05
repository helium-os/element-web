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
import { Room } from "matrix-js-sdk/src/models/room";
import React, { useState, useEffect, useContext } from "react";

import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import dis from "../../../dispatcher/dispatcher";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { useUnreadNotifications } from "../../../hooks/useUnreadNotifications";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { _t } from "../../../languageHandler";
import { NotificationColor } from "../../../stores/notifications/NotificationColor";
import { DefaultTagID } from "../../../stores/room-list/models";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../../stores/room-list/RoomListStore";
import { clearRoomNotification } from "../../../utils/notifications";
import { ContextMenuProps as IContextMenuProps } from "../../structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuCheckbox,
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";
import { ButtonEvent } from "../elements/AccessibleButton";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { showRoomInviteDialog } from "matrix-react-sdk/src/RoomInvite";

export interface RoomGeneralContextMenuProps extends IContextMenuProps {
    room: Room;
    onPostSettingsClick?: (event: ButtonEvent) => void;
}

export const RoomGeneralContextMenu: React.FC<RoomGeneralContextMenuProps> = ({
    room,
    onFinished,
    onPostSettingsClick,
    ...props
}) => {
    const cli = useContext(MatrixClientContext);

    const [isAdminLeft, setIsAdminLeft] = useState(false);

    useEffect(() => {
        setIsAdminLeft(room.isAdminLeft());
    }, [room]);

    const roomTags = useEventEmitterState(RoomListStore.instance, LISTS_UPDATE_EVENT, () =>
        RoomListStore.instance.getTagsForRoom(room),
    );
    const wrapHandler = (
        handler: (ev: ButtonEvent) => void,
        postHandler?: (ev: ButtonEvent) => void,
        persistent = false,
    ): ((ev: ButtonEvent) => void) => {
        return (ev: ButtonEvent) => {
            ev.preventDefault();
            ev.stopPropagation();

            handler(ev);

            const action = getKeyBindingsManager().getAccessibilityAction(ev as React.KeyboardEvent);
            if (!persistent || action === KeyBindingAction.Enter) {
                onFinished();
            }
            postHandler?.(ev);
        };
    };

    const isPeopleRoom = room.isPeopleRoom();
    const settingsOption: JSX.Element = !isPeopleRoom && (
        <IconizedContextMenuOption
            onClick={wrapHandler(
                () =>
                    dis.dispatch({
                        action: "open_room_settings",
                        room_id: room.roomId,
                    }),
                onPostSettingsClick,
            )}
            label={_t("Settings")}
        />
    );

    const { color } = useUnreadNotifications(room);
    const markAsReadOption: JSX.Element | null =
        color > NotificationColor.None ? (
            <IconizedContextMenuCheckbox
                onClick={() => {
                    clearRoomNotification(room, cli);
                    onFinished?.();
                }}
                active={false}
                label={_t("Mark as read")}
                iconClassName="mx_RoomGeneralContextMenu_iconMarkAsRead"
            />
        ) : null;

    const onInvitePeople = () => {
        showRoomInviteDialog(room.roomId, "", true);
    };

    // 私密频道特权用户展示邀请成员按钮
    let inviteOption;
    if (SpaceStore.instance.canManageSpacePrivateChannel && room.isPrivateRoom()) {
        inviteOption = <IconizedContextMenuOption onClick={onInvitePeople} label={_t("Invite people")} />;
    }

    return (
        <IconizedContextMenu {...props} onFinished={onFinished} className="mx_RoomGeneralContextMenu" compact>
            <IconizedContextMenuOptionList>
                {/*{markAsReadOption}*/}
                {inviteOption}
                {!roomTags.includes(DefaultTagID.Archived) && !isAdminLeft && <>{settingsOption}</>}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
    );
};
