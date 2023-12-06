/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 - 2023 The Matrix.org Foundation C.I.C.

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
import classNames from "classnames";
import { NotificationCountType, Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { ThreadEvent } from "matrix-js-sdk/src/models/thread";

import { _t } from "../../../languageHandler";
import HeaderButton from "./HeaderButton";
import HeaderButtons, { HeaderKind } from "./HeaderButtons";
import { HeaderButtonAction, RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { Action } from "../../../dispatcher/actions";
import { ActionPayload } from "../../../dispatcher/payloads";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { showThreadPanel } from "../../../dispatcher/dispatch-actions/threads";
import {
    RoomNotificationStateStore,
    UPDATE_STATUS_INDICATOR,
} from "../../../stores/notifications/RoomNotificationStateStore";
import { NotificationColor } from "../../../stores/notifications/NotificationColor";
import { SummarizedNotificationState } from "../../../stores/notifications/SummarizedNotificationState";
import PosthogTrackers from "../../../PosthogTrackers";
import { ButtonEvent } from "../elements/AccessibleButton";
import { doesRoomOrThreadHaveUnreadMessages } from "../../../Unread";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { showRoomInviteDialog } from "matrix-react-sdk/src/RoomInvite";
import Modal from "matrix-react-sdk/src/Modal";
import CreateRoomBaseChatDialog from "matrix-react-sdk/src/components/views/dialogs/CreateRoomBaseChatDialog";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

const ROOM_INFO_PHASES = [
    RightPanelPhases.RoomSummary,
    RightPanelPhases.Widget,
    RightPanelPhases.FilePanel,
    RightPanelPhases.RoomMemberList,
    RightPanelPhases.RoomMemberInfo,
    RightPanelPhases.EncryptionPanel,
    RightPanelPhases.Room3pidMemberInfo,
];

interface IUnreadIndicatorProps {
    color?: NotificationColor;
}

const UnreadIndicator: React.FC<IUnreadIndicatorProps> = ({ color }) => {
    if (color === NotificationColor.None) {
        return null;
    }

    const classes = classNames({
        mx_Indicator: true,
        mx_RightPanel_headerButton_unreadIndicator: true,
        mx_Indicator_bold: color === NotificationColor.Bold,
        mx_Indicator_gray: color === NotificationColor.Grey,
        mx_Indicator_red: color === NotificationColor.Red,
    });
    return (
        <>
            <div className="mx_RightPanel_headerButton_unreadIndicator_bg" />
            <div className={classes} />
        </>
    );
};

interface IProps {
    room?: Room;
    excludedRightPanelPhaseButtons?: Array<RightPanelPhases>;
}

export default class RoomHeaderButtons extends HeaderButtons<IProps> {
    private static readonly THREAD_PHASES = [RightPanelPhases.ThreadPanel, RightPanelPhases.ThreadView];
    private globalNotificationState: SummarizedNotificationState;

    public constructor(props: IProps) {
        super(props, HeaderKind.Room);
        this.globalNotificationState = RoomNotificationStateStore.instance.globalState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        // Notification badge may change if the notification counts from the
        // server change, if a new thread is created or updated, or if a
        // receipt is sent in the thread.
        this.props.room?.on(RoomEvent.UnreadNotifications, this.onNotificationUpdate);
        this.props.room?.on(RoomEvent.Receipt, this.onNotificationUpdate);
        this.props.room?.on(RoomEvent.Timeline, this.onNotificationUpdate);
        this.props.room?.on(RoomEvent.Redaction, this.onNotificationUpdate);
        this.props.room?.on(RoomEvent.LocalEchoUpdated, this.onNotificationUpdate);
        this.props.room?.on(RoomEvent.MyMembership, this.onNotificationUpdate);
        this.props.room?.on(ThreadEvent.New, this.onNotificationUpdate);
        this.props.room?.on(ThreadEvent.Update, this.onNotificationUpdate);
        this.onNotificationUpdate();
        RoomNotificationStateStore.instance.on(UPDATE_STATUS_INDICATOR, this.onUpdateStatus);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.room?.off(RoomEvent.UnreadNotifications, this.onNotificationUpdate);
        this.props.room?.off(RoomEvent.Receipt, this.onNotificationUpdate);
        this.props.room?.off(RoomEvent.Timeline, this.onNotificationUpdate);
        this.props.room?.off(RoomEvent.Redaction, this.onNotificationUpdate);
        this.props.room?.off(RoomEvent.LocalEchoUpdated, this.onNotificationUpdate);
        this.props.room?.off(RoomEvent.MyMembership, this.onNotificationUpdate);
        this.props.room?.off(ThreadEvent.New, this.onNotificationUpdate);
        this.props.room?.off(ThreadEvent.Update, this.onNotificationUpdate);
        RoomNotificationStateStore.instance.off(UPDATE_STATUS_INDICATOR, this.onUpdateStatus);
    }

    private onNotificationUpdate = (): void => {
        // console.log
        // XXX: why don't we read from this.state.threadNotificationColor in the render methods?
        this.setState({
            threadNotificationColor: this.notificationColor,
        });
    };

    private get notificationColor(): NotificationColor {
        switch (this.props.room?.threadsAggregateNotificationType) {
            case NotificationCountType.Highlight:
                return NotificationColor.Red;
            case NotificationCountType.Total:
                return NotificationColor.Grey;
        }
        // We don't have any notified messages, but we might have unread messages. Let's
        // find out.
        for (const thread of this.props.room!.getThreads()) {
            // If the current thread has unread messages, we're done.
            if (doesRoomOrThreadHaveUnreadMessages(thread)) {
                return NotificationColor.Bold;
            }
        }
        // Otherwise, no notification color.
        return NotificationColor.None;
    }

    private onUpdateStatus = (notificationState: SummarizedNotificationState): void => {
        // XXX: why don't we read from this.state.globalNotificationCount in the render methods?
        this.globalNotificationState = notificationState;
        this.setState({
            globalNotificationColor: notificationState.color,
        });
    };

    protected onAction(payload: ActionPayload): void {
        if (payload.action === Action.ViewUser) {
            if (payload.member) {
                if (payload.push) {
                    RightPanelStore.instance.pushCard({
                        phase: RightPanelPhases.RoomMemberInfo,
                        state: { member: payload.member },
                    });
                } else {
                    RightPanelStore.instance.setCards([
                        { phase: RightPanelPhases.RoomSummary },
                        { phase: RightPanelPhases.RoomMemberList },
                        { phase: RightPanelPhases.RoomMemberInfo, state: { member: payload.member } },
                    ]);
                }
            } else {
                this.setPhase(RightPanelPhases.RoomMemberList);
            }
        } else if (payload.action === "view_3pid_invite") {
            if (payload.event) {
                this.setPhase(RightPanelPhases.Room3pidMemberInfo, { memberInfoEvent: payload.event });
            } else {
                this.setPhase(RightPanelPhases.RoomMemberList);
            }
        }
    }

    private onRoomSummaryClicked = (): void => {
        // use roomPanelPhase rather than this.state.phase as it remembers the latest one if we close
        const currentPhase = RightPanelStore.instance.currentCard.phase;
        if (currentPhase && ROOM_INFO_PHASES.includes(currentPhase)) {
            if (this.state.phase === currentPhase) {
                this.setPhase(currentPhase);
            } else {
                this.setPhase(currentPhase, RightPanelStore.instance.currentCard.state);
            }
        } else {
            // This toggles for us, if needed
            this.setPhase(RightPanelPhases.RoomSummary);
        }
    };

    private onNotificationsClicked = (): void => {
        // This toggles for us, if needed
        this.setPhase(RightPanelPhases.NotificationPanel);
    };

    private onUserInfoClicked = (): void => {
        // This toggles for us, if needed
        if (!this.props.room) return;
        const [people] = this.props.room
            .getMembers()
            .filter((item) => item.userId !== MatrixClientPeg.get().getUserId());
        this.setPhase(RightPanelPhases.RoomMemberInfo, {
            member: people,
        });
    };

    private onRoomMemberListClicked = (): void => {
        if (!this.props.room) return;
        this.setPhase(RightPanelPhases.RoomMemberList);
    };

    private onThreadsPanelClicked = (ev: ButtonEvent): void => {
        if (this.state.phase && RoomHeaderButtons.THREAD_PHASES.includes(this.state.phase)) {
            RightPanelStore.instance.togglePanel(this.props.room?.roomId ?? null);
        } else {
            showThreadPanel();
            PosthogTrackers.trackInteraction("WebRoomHeaderButtonsThreadsButton", ev);
        }
    };

    private onRoomSettingsClicked = () => {
        this.setPhase(RightPanelPhases.RoomSettings);
    };

    // 邀请成员并创建群聊
    private onInviteUsersAndCreateRoom = () => {
        Modal.createDialog(CreateRoomBaseChatDialog, {
            room: this.props.room,
        });
    };

    // 邀请成员
    private onInviteUsers = () => {
        showRoomInviteDialog(this.props.room.roomId);
    };

    public renderButtons(): JSX.Element {
        if (!this.props.room) {
            return <></>;
        }

        const rightPanelPhaseButtons: Map<RightPanelPhases | HeaderButtonAction, any> = new Map();

        // if (SettingsStore.getValue("feature_pinning")) {
        //     rightPanelPhaseButtons.set(
        //         RightPanelPhases.PinnedMessages,
        //         <PinnedMessagesHeaderButton
        //             key="pinnedMessagesButton"
        //             room={this.props.room}
        //             isHighlighted={this.isPhase(RightPanelPhases.PinnedMessages)}
        //             onClick={this.onPinnedMessagesClicked}
        //         />,
        //     );
        // }
        // rightPanelPhaseButtons.set(
        //     RightPanelPhases.Timeline,
        //     <TimelineCardHeaderButton
        //         key="timelineButton"
        //         room={this.props.room}
        //         isHighlighted={this.isPhase(RightPanelPhases.Timeline)}
        //         onClick={this.onTimelineCardClicked}
        //     />,
        // );
        rightPanelPhaseButtons.set(
            HeaderButtonAction.Notification,
            <HeaderButton
                key="notifsButton"
                name="notifsButton"
                title={_t("Notifications")}
                onClick={this.onNotificationsClicked}
            />,
        );
        if (this.props.room.isPeopleRoom()) {
            // 私聊
            rightPanelPhaseButtons.set(
                HeaderButtonAction.InviteAndCreateRoom,
                <HeaderButton
                    key="inviteUsersButton"
                    name="inviteUsersButton"
                    title={"添加成员,并创建群聊"}
                    onClick={this.onInviteUsersAndCreateRoom}
                />,
            );
            rightPanelPhaseButtons.set(
                RightPanelPhases.RoomMemberInfo,
                <HeaderButton
                    key="memberInfoButton"
                    name="memberInfoButton"
                    title={"用户信息"}
                    isHighlighted={this.isPhase(RightPanelPhases.RoomMemberInfo)}
                    onClick={this.onUserInfoClicked}
                />,
            );
        } else {
            const isHomeSpace = SpaceStore.instance.isHomeSpace;
            // 群聊 || 频道
            isHomeSpace &&
                rightPanelPhaseButtons.set(
                    HeaderButtonAction.Invite,
                    <HeaderButton
                        key="inviteUsersButton"
                        name="inviteUsersButton"
                        title={_t("Invite users")}
                        onClick={this.onInviteUsers}
                    />,
                );

            rightPanelPhaseButtons.set(
                RightPanelPhases.RoomMemberList,
                <HeaderButton
                    key="roomMembersButton"
                    name="roomMembersButton"
                    title={"成员列表"}
                    isHighlighted={this.isPhase(RightPanelPhases.RoomMemberList)}
                    onClick={this.onRoomMemberListClicked}
                />,
            );

            !isHomeSpace &&
                rightPanelPhaseButtons.set(
                    RightPanelPhases.ThreadPanel,
                    <HeaderButton
                        key={RightPanelPhases.ThreadPanel}
                        name="threadsButton"
                        data-testid="threadsButton"
                        title={_t("Threads")}
                        onClick={this.onThreadsPanelClicked}
                        isHighlighted={this.isPhase(RoomHeaderButtons.THREAD_PHASES)}
                        isUnread={this.state.threadNotificationColor > 0}
                    >
                        <UnreadIndicator color={this.state.threadNotificationColor} />
                    </HeaderButton>,
                );

            isHomeSpace &&
                rightPanelPhaseButtons.set(
                    RightPanelPhases.RoomSettings,
                    <HeaderButton
                        key="roomSettingsButton"
                        name="roomSettingsButton"
                        title={"群设置"}
                        isHighlighted={this.isPhase(RightPanelPhases.RoomSettings)}
                        onClick={this.onRoomSettingsClicked}
                    />,
                );
        }
        return (
            <>
                {Array.from(rightPanelPhaseButtons.keys()).map((phase) =>
                    this.props.excludedRightPanelPhaseButtons?.includes(phase)
                        ? null
                        : rightPanelPhaseButtons.get(phase),
                )}
            </>
        );
    }
}
