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
import React from "react";

import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import { useNotificationState } from "../../../hooks/useRoomNotificationState";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { _t } from "../../../languageHandler";
import { RoomNotifState } from "../../../RoomNotifs";
import { ContextMenuProps as IContextMenuProps } from "../../structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "../context_menus/IconizedContextMenu";
import { ButtonEvent } from "../elements/AccessibleButton";

interface IProps extends IContextMenuProps {
    room: Room;
}

const notificationsMap = [
    // {
    //     key: RoomNotifState.AllMessages,
    //     label: _t("Use default"),
    //     icon: "Bell",
    // },
    {
        key: RoomNotifState.AllMessagesLoud,
        label: _t("All messages"),
        icon: "BellDot",
    },
    {
        key: RoomNotifState.MentionsOnly,
        label: _t("Mentions & Keywords"),
        icon: "BellMentions",
    },
    {
        key: RoomNotifState.Mute,
        label: _t("Off"),
        icon: "BellCrossed",
    },
];

export const RoomNotificationContextMenu: React.FC<IProps> = ({ room, onFinished, ...props }) => {
    const [notificationState, setNotificationState] = useNotificationState(room);

    const wrapHandler = (handler: (ev: ButtonEvent) => void, persistent = false): ((ev: ButtonEvent) => void) => {
        return (ev: ButtonEvent) => {
            ev.preventDefault();
            ev.stopPropagation();

            handler(ev);

            const action = getKeyBindingsManager().getAccessibilityAction(ev as React.KeyboardEvent);
            if (!persistent || action === KeyBindingAction.Enter) {
                onFinished();
            }
        };
    };

    return (
        <IconizedContextMenu
            {...props}
            onFinished={onFinished}
            className="mx_RoomNotificationContextMenu"
            menuWidth={178}
            compact
        >
            <IconizedContextMenuOptionList first>
                {notificationsMap.map((item) => (
                    <IconizedContextMenuRadio
                        key={item.key}
                        label={item.label}
                        active={notificationState === item.key}
                        iconClassName={`mx_RoomNotification_icon mx_RoomNotificationContextMenu_icon${item.icon}`}
                        onClick={wrapHandler(() => setNotificationState(item.key))}
                    />
                ))}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
    );
};
