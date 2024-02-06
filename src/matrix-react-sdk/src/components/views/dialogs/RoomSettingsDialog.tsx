/*
Copyright 2019 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

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

import React from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";

import TabbedView, { Tab } from "../../structures/TabbedView";
import { _t } from "../../../languageHandler";
import AdvancedRoomSettingsTab from "../settings/tabs/room/AdvancedRoomSettingsTab";
import RolesRoomSettingsTab from "../settings/tabs/room/RolesRoomSettingsTab";
import GeneralRoomSettingsTab from "../settings/tabs/room/GeneralRoomSettingsTab";
import Button, { ButtonSize, ButtonType } from "matrix-react-sdk/src/components/views/button/Button";
import NotificationSettingsTab from "../settings/tabs/room/NotificationSettingsTab";
import BridgeSettingsTab from "../settings/tabs/room/BridgeSettingsTab";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import dis from "../../../dispatcher/dispatcher";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import { Action } from "../../../dispatcher/actions";
import { VoipRoomSettingsTab } from "../settings/tabs/room/VoipRoomSettingsTab";
import { ActionPayload } from "../../../dispatcher/payloads";
import { NonEmptyArray } from "../../../@types/common";
import { PollHistoryTab } from "../settings/tabs/room/PollHistoryTab";
import RoomSettingsBaseDialog from "matrix-react-sdk/src/components/views/dialogs/RoomSettingsBaseDialog";
import trashSvg from "matrix-react-sdk/res/img/feather-customised/trash.svg";
import withRoomPermissions from "matrix-react-sdk/src/hocs/withRoomPermissions";
import { StateEventType } from "matrix-react-sdk/src/powerLevel";
import SecurityRoomSettingsTab from "matrix-react-sdk/src/components/views/settings/tabs/room/SecurityRoomSettingsTab";

export const ROOM_GENERAL_TAB = "ROOM_GENERAL_TAB";
export const ROOM_VOIP_TAB = "ROOM_VOIP_TAB";
export const ROOM_SECURITY_TAB = "ROOM_SECURITY_TAB";
export const ROOM_ROLES_TAB = "ROOM_ROLES_TAB";
export const ROOM_NOTIFICATIONS_TAB = "ROOM_NOTIFICATIONS_TAB";
export const ROOM_BRIDGES_TAB = "ROOM_BRIDGES_TAB";
export const ROOM_ADVANCED_TAB = "ROOM_ADVANCED_TAB";
export const ROOM_POLL_HISTORY_TAB = "ROOM_POLL_HISTORY_TAB";

interface BaseProps {
    roomId: string;
    onFinished: (success?: boolean) => void;
    initialTabId?: string;
}
interface IProps extends BaseProps {
    room: Room;
    canDelete: boolean;
}

interface IState {
    roomName: string;
}

class RoomSettingsDialog extends React.PureComponent<IProps, IState> {
    private dispatcherRef: string;

    public constructor(props: IProps) {
        super(props);
        this.state = {
            roomName: "",
        };
    }

    public componentDidMount(): void {
        this.dispatcherRef = dis.register(this.onAction);
        MatrixClientPeg.get().on(RoomEvent.Name, this.onRoomName);

        this.onRoomName();
    }

    public componentDidUpdate(prevProps: IProps, prevState: IState): void {}

    public componentWillUnmount(): void {
        if (this.dispatcherRef) {
            dis.unregister(this.dispatcherRef);
        }

        MatrixClientPeg.get().removeListener(RoomEvent.Name, this.onRoomName);
    }

    private onAction = (payload: ActionPayload): void => {
        // When view changes below us, close the room settings
        // whilst the modal is open this can only be triggered when someone hits Leave Room
        switch (payload.action) {
            case Action.ViewHomePage:
                this.props.onFinished(true);
                break;
            case Action.AfterLeaveRoom:
                if (payload.room_id === this.props.roomId) {
                    this.props.onFinished(true);
                }
                break;
        }
    };

    private onRoomName = (): void => {
        this.setState({
            roomName: this.props.room?.name ?? "",
        });
    };

    private onDeleteClick = async () => {
        dis.dispatch({
            action: "delete_room",
            room_id: this.props.roomId,
        });
    };

    private getTabs(): NonEmptyArray<Tab> {
        const room = MatrixClientPeg.get().getRoom(this.props.roomId);

        const tabs: Tab[] = [];

        tabs.push(
            new Tab(
                ROOM_GENERAL_TAB,
                _t("General"),
                "mx_RoomSettingsDialog_settingsIcon",
                <GeneralRoomSettingsTab room={room} />,
                "RoomSettingsGeneral",
            ),
        );
        if (SettingsStore.getValue("feature_group_calls")) {
            tabs.push(
                new Tab(
                    ROOM_VOIP_TAB,
                    _t("Voice & Video"),
                    "mx_RoomSettingsDialog_voiceIcon",
                    <VoipRoomSettingsTab roomId={this.props.roomId} />,
                ),
            );
        }

        if (SettingsStore.getValue(UIFeature.RoomSecurityAndPrivacySettings)) {
            tabs.push(
                new Tab(
                    ROOM_SECURITY_TAB,
                    _t("Security & Privacy"),
                    "mx_RoomSettingsDialog_securityIcon",
                    (
                        <SecurityRoomSettingsTab
                            roomId={this.props.roomId}
                            closeSettingsFn={() => this.props.onFinished(true)}
                        />
                    ),
                    "RoomSettingsSecurityPrivacy",
                ),
            );
        }

        if (SettingsStore.getValue(UIFeature.RoomRolesAndPermissionsSettings)) {
            tabs.push(
                new Tab(
                    ROOM_ROLES_TAB,
                    _t("Roles & Permissions"),
                    "mx_RoomSettingsDialog_rolesIcon",
                    <RolesRoomSettingsTab roomId={this.props.roomId} />,
                    "RoomSettingsRolesPermissions",
                ),
            );
        }

        if (SettingsStore.getValue(UIFeature.RoomNotificationsSettings)) {
            tabs.push(
                new Tab(
                    ROOM_NOTIFICATIONS_TAB,
                    _t("Notifications"),
                    "mx_RoomSettingsDialog_notificationsIcon",
                    (
                        <NotificationSettingsTab
                            roomId={this.props.roomId}
                            closeSettingsFn={() => this.props.onFinished(true)}
                        />
                    ),
                    "RoomSettingsNotifications",
                ),
            );
        }

        if (SettingsStore.getValue("feature_bridge_state")) {
            tabs.push(
                new Tab(
                    ROOM_BRIDGES_TAB,
                    _t("Bridges"),
                    "mx_RoomSettingsDialog_bridgesIcon",
                    <BridgeSettingsTab roomId={this.props.roomId} />,
                    "RoomSettingsBridges",
                ),
            );
        }

        if (SettingsStore.getValue(UIFeature.RoomPollHistorySettings)) {
            tabs.push(
                new Tab(
                    ROOM_POLL_HISTORY_TAB,
                    _t("Poll history"),
                    "mx_RoomSettingsDialog_pollsIcon",
                    <PollHistoryTab roomId={this.props.roomId} onFinished={() => this.props.onFinished(true)} />,
                ),
            );
        }

        if (SettingsStore.getValue(UIFeature.RoomAdvancedSettings)) {
            tabs.push(
                new Tab(
                    ROOM_ADVANCED_TAB,
                    _t("Advanced"),
                    "mx_RoomSettingsDialog_warningIcon",
                    (
                        <AdvancedRoomSettingsTab
                            roomId={this.props.roomId}
                            closeSettingsFn={() => this.props.onFinished(true)}
                        />
                    ),
                    "RoomSettingsAdvanced",
                ),
            );
        }

        return tabs as NonEmptyArray<Tab>;
    }

    public render(): React.ReactNode {
        const roomName = this.state.roomName;

        const footer = this.props.canDelete && (
            <Button
                type={ButtonType.Text}
                size={ButtonSize.Small}
                danger
                icon={trashSvg}
                iconClassName="mx_DeleteRoom_icon"
                onClick={this.onDeleteClick}
            >
                {"删除频道"}
            </Button>
        );

        return (
            <RoomSettingsBaseDialog onFinished={this.props.onFinished}>
                <TabbedView
                    title={roomName}
                    footer={footer}
                    tabs={this.getTabs()}
                    initialTabId={this.props.initialTabId}
                    defaultTabId={ROOM_GENERAL_TAB}
                    screenName="RoomSettings"
                />
            </RoomSettingsBaseDialog>
        );
    }
}

export default withRoomPermissions<BaseProps>(RoomSettingsDialog, {
    canDelete: {
        eventType: StateEventType.Delete,
        state: true,
    },
});
