/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019, 2021 The Matrix.org Foundation C.I.C.

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

import React, { FC, useCallback } from "react";
import classNames from "classnames";
import { throttle } from "lodash";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";

import type { MatrixEvent } from "matrix-js-sdk/src/models/event";
import type { Room } from "matrix-js-sdk/src/models/room";
import { _t } from "../../../languageHandler";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { UserTab } from "../dialogs/UserTab";
import SettingsStore from "../../../settings/SettingsStore";
import RoomHeaderButtons from "../right_panel/RoomHeaderButtons";
import E2EIcon from "./E2EIcon";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import RoomTopic from "../elements/RoomTopic";
import RoomName from "../elements/RoomName";
import { E2EStatus } from "../../../utils/ShieldUtils";
import { IOOBData } from "../../../stores/ThreepidInviteStore";
import { aboveLeftOf, useContextMenu } from "../../structures/ContextMenu";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { NotificationStateEvents } from "../../../stores/notifications/NotificationState";
import RoomContext from "../../../contexts/RoomContext";
import RoomLiveShareWarning from "../beacon/RoomLiveShareWarning";
import { BetaPill } from "../beta/BetaCard";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { isVideoRoom as calcIsVideoRoom } from "../../../utils/video-rooms";
import { useLayout } from "../../../hooks/useCall";
import { Call, ElementCall, Layout } from "../../../models/Call";
import IconizedContextMenu, {
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "../context_menus/IconizedContextMenu";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { GroupCallDuration } from "../voip/CallDuration";
import { Alignment } from "../elements/Tooltip";
import RoomCallBanner from "../beacon/RoomCallBanner";
import RoomAndChannelAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAndChannelAvatar";
import LayoutStore, { UPDATE_SHOW_LEFT_PANEL } from "matrix-react-sdk/src/stores/LayoutStore";
import { isInApp } from "matrix-react-sdk/src/utils/env";
import AppBackLeftPanelBtn from "matrix-react-sdk/src/components/views/elements/AppBackLeftPanelBtn";

interface CallLayoutSelectorProps {
    call: ElementCall;
}

const CallLayoutSelector: FC<CallLayoutSelectorProps> = ({ call }) => {
    const layout = useLayout(call);
    const [menuOpen, buttonRef, openMenu, closeMenu] = useContextMenu();

    const onClick = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            openMenu();
        },
        [openMenu],
    );

    const onFreedomClick = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            closeMenu();
            call.setLayout(Layout.Tile);
        },
        [closeMenu, call],
    );

    const onSpotlightClick = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            closeMenu();
            call.setLayout(Layout.Spotlight);
        },
        [closeMenu, call],
    );

    let menu: JSX.Element | null = null;
    if (menuOpen) {
        const buttonRect = buttonRef.current!.getBoundingClientRect();
        menu = (
            <IconizedContextMenu
                className="mx_RoomHeader_layoutMenu"
                {...aboveLeftOf(buttonRect)}
                onFinished={closeMenu}
            >
                <IconizedContextMenuOptionList>
                    <IconizedContextMenuRadio
                        iconClassName="mx_RoomHeader_freedomIcon"
                        label={_t("Freedom")}
                        active={layout === Layout.Tile}
                        onClick={onFreedomClick}
                    />
                    <IconizedContextMenuRadio
                        iconClassName="mx_RoomHeader_spotlightIcon"
                        label={_t("Spotlight")}
                        active={layout === Layout.Spotlight}
                        onClick={onSpotlightClick}
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    return (
        <>
            <AccessibleTooltipButton
                inputRef={buttonRef}
                className={classNames("mx_RoomHeader_button", {
                    "mx_RoomHeader_layoutButton--freedom": layout === Layout.Tile,
                    "mx_RoomHeader_layoutButton--spotlight": layout === Layout.Spotlight,
                })}
                onClick={onClick}
                title={_t("Change layout")}
                alignment={Alignment.Bottom}
                key="layout"
            />
            {menu}
        </>
    );
};

export interface IProps {
    room: Room;
    oobData?: IOOBData;
    inRoom: boolean;
    onInviteClick: (() => void) | null;
    onForgetClick: (() => void) | null;
    onAppsClick: (() => void) | null;
    e2eStatus: E2EStatus;
    appsShown: boolean;
    excludedRightPanelPhaseButtons?: Array<RightPanelPhases>;
    showButtons?: boolean;
    enableRoomOptionsMenu?: boolean;
    viewingCall: boolean;
    activeCall: Call | null;
}

interface IState {
    contextMenuPosition?: DOMRect;
    rightPanelOpen: boolean;
    showE2EIcon: boolean;
    showLeftPanel: boolean;
}

export default class RoomHeader extends React.Component<IProps, IState> {
    public static defaultProps: Partial<IProps> = {
        inRoom: false,
        excludedRightPanelPhaseButtons: [],
        showButtons: true,
        enableRoomOptionsMenu: true,
    };

    public static contextType = RoomContext;
    public context!: React.ContextType<typeof RoomContext>;
    private readonly client = this.props.room.client;

    public constructor(props: IProps, context: IState) {
        super(props, context);
        const notiStore = RoomNotificationStateStore.instance.getRoomState(props.room);
        notiStore.on(NotificationStateEvents.Update, this.onNotificationUpdate);
        this.state = {
            rightPanelOpen: RightPanelStore.instance.isOpen,
            showE2EIcon: false,
            showLeftPanel: LayoutStore.instance.showLeftPanel,
        };
    }

    public componentDidMount(): void {
        this.client.on(RoomStateEvent.Events, this.onRoomStateEvents);
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        LayoutStore.instance.on(UPDATE_SHOW_LEFT_PANEL, this.updateShowLeftPanel);
    }

    public componentWillUnmount(): void {
        this.client.removeListener(RoomStateEvent.Events, this.onRoomStateEvents);
        const notiStore = RoomNotificationStateStore.instance.getRoomState(this.props.room);
        notiStore.removeListener(NotificationStateEvents.Update, this.onNotificationUpdate);
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelStoreUpdate);
    }

    private updateShowLeftPanel = () => {
        this.setState({
            showLeftPanel: LayoutStore.instance.showLeftPanel,
        });
    };

    private onRightPanelStoreUpdate = (): void => {
        this.setState({ rightPanelOpen: RightPanelStore.instance.isOpen });
    };

    private onRoomStateEvents = (event: MatrixEvent): void => {
        if (!this.props.room || event.getRoomId() !== this.props.room.roomId) {
            return;
        }

        // redisplay the room name, topic, etc.
        this.rateLimitedUpdate();
    };

    private onNotificationUpdate = (): void => {
        this.forceUpdate();
    };

    private rateLimitedUpdate = throttle(
        () => {
            this.forceUpdate();
        },
        500,
        { leading: true, trailing: true },
    );

    private onHideCallClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: this.props.room.roomId,
            view_call: false,
            metricsTrigger: undefined,
        });
    };

    private renderButtons(isVideoRoom: boolean): React.ReactNode {
        const startButtons: JSX.Element[] = [];

        if (this.props.viewingCall && this.props.activeCall instanceof ElementCall) {
            startButtons.push(<CallLayoutSelector key="layout" call={this.props.activeCall} />);
        }

        if (!this.props.viewingCall && this.props.onForgetClick) {
            // startButtons.push(
            //     <AccessibleTooltipButton
            //         className="mx_RoomHeader_button mx_RoomHeader_forgetButton"
            //         onClick={this.props.onForgetClick}
            //         title={_t("Forget room")}
            //         alignment={Alignment.Bottom}
            //         key="forget"
            //     />,
            // );
        }

        if (!this.props.viewingCall && this.props.onAppsClick) {
            startButtons.push(
                <AccessibleTooltipButton
                    className={classNames("mx_RoomHeader_button mx_RoomHeader_appsButton", {
                        mx_RoomHeader_appsButton_highlight: this.props.appsShown,
                    })}
                    onClick={this.props.onAppsClick}
                    title={this.props.appsShown ? _t("Hide Widgets") : _t("Show Widgets")}
                    alignment={Alignment.Bottom}
                    key="apps"
                />,
            );
        }

        if (this.props.onInviteClick && (!this.props.viewingCall || isVideoRoom) && this.props.inRoom) {
            startButtons.push(
                <AccessibleTooltipButton
                    className="mx_RoomHeader_button mx_RoomHeader_inviteButton"
                    onClick={this.props.onInviteClick}
                    title={_t("Invite")}
                    alignment={Alignment.Bottom}
                    key="invite"
                />,
            );
        }

        const endButtons: JSX.Element[] = [];

        if (this.props.viewingCall && !isVideoRoom) {
            if (this.props.activeCall === null) {
                endButtons.push(
                    <AccessibleButton
                        className="mx_RoomHeader_button mx_RoomHeader_closeButton"
                        onClick={this.onHideCallClick}
                        title={_t("Close call")}
                        key="close"
                    />,
                );
            } else {
                endButtons.push(
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_RoomHeader_minimiseButton"
                        onClick={this.onHideCallClick}
                        title={_t("View chat timeline")}
                        alignment={Alignment.Bottom}
                        key="minimise"
                    />,
                );
            }
        }

        return (
            <>
                {startButtons}
                <RoomHeaderButtons
                    room={this.props.room}
                    excludedRightPanelPhaseButtons={this.props.excludedRightPanelPhaseButtons}
                />
                {endButtons}
            </>
        );
    }

    private renderName(oobName: string): JSX.Element {
        // XXX: this is a bit inefficient - we could just compare room.name for 'Empty room'...
        let settingsHint = false;
        const members = this.props.room ? this.props.room.getJoinedMembers() : undefined;
        if (members) {
            if (members.length === 1 && members[0].userId === this.client.credentials.userId) {
                const nameEvent = this.props.room.currentState.getStateEvents("m.room.name", "");
                if (!nameEvent || !nameEvent.getContent().name) {
                    settingsHint = true;
                }
            }
        }

        const textClasses = classNames("mx_RoomHeader_nametext", { mx_RoomHeader_settingsHint: settingsHint });
        const roomName = (
            <RoomName room={this.props.room}>
                {(name) => {
                    const roomName = name || oobName;
                    return (
                        <div dir="auto" className={textClasses} title={roomName} role="heading" aria-level={1}>
                            {roomName}
                        </div>
                    );
                }}
            </RoomName>
        );

        return <div className="mx_RoomHeader_name mx_RoomHeader_name--textonly">{roomName}</div>;
    }

    private onShowLeftPanel = () => {
        LayoutStore.instance.setShowLeftPanel(true);
    };

    public render(): React.ReactNode {
        const isVideoRoom = SettingsStore.getValue("feature_video_rooms") && calcIsVideoRoom(this.props.room);

        let roomAvatar: JSX.Element | null = null;
        if (this.props.room) {
            roomAvatar = (
                <RoomAndChannelAvatar
                    room={this.props.room}
                    avatarSize={24}
                    oobData={this.props.oobData}
                    viewAvatarOnClick={true}
                />
            );
        }

        const icon = this.props.viewingCall ? (
            <div className="mx_RoomHeader_icon mx_RoomHeader_icon_video" />
        ) : !this.state.showE2EIcon ? null : this.props.e2eStatus ? (
            <E2EIcon className="mx_RoomHeader_icon" status={this.props.e2eStatus} tooltipAlignment={Alignment.Bottom} />
        ) : // If we're expecting an E2EE status to come in, but it hasn't
        // yet been loaded, insert a blank div to reserve space
        this.client.isRoomEncrypted(this.props.room.roomId) && this.client.isCryptoEnabled() ? (
            <div className="mx_RoomHeader_icon" />
        ) : null;

        const buttons = this.props.showButtons ? this.renderButtons(isVideoRoom) : null;

        let oobName = _t("Join Room");
        if (this.props.oobData && this.props.oobData.name) {
            oobName = this.props.oobData.name;
        }

        const name = this.renderName(oobName);

        if (this.props.viewingCall && !isVideoRoom) {
            return (
                <header className="mx_RoomHeader light-panel">
                    <div
                        className="mx_RoomHeader_wrapper"
                        aria-owns={this.state.rightPanelOpen ? "mx_RightPanel" : undefined}
                    >
                        <div className="mx_RoomHeader_name_topic">
                            <div className="mx_RoomHeader_name_box">
                                <div className="mx_RoomHeader_avatar">{roomAvatar}</div>
                                {name}
                            </div>
                            <div className="mx_RoomHeader_topic" />
                        </div>
                        {this.props.activeCall instanceof ElementCall && (
                            <GroupCallDuration groupCall={this.props.activeCall.groupCall} />
                        )}
                        {buttons}
                    </div>
                </header>
            );
        }

        const topicElement = <RoomTopic room={this.props.room} className="mx_RoomHeader_topic" />;

        const viewLabs = (): void =>
            defaultDispatcher.dispatch({
                action: Action.ViewUserSettings,
                initialTabId: UserTab.Labs,
            });
        const betaPill = isVideoRoom ? (
            <BetaPill onClick={viewLabs} tooltipTitle={_t("Video rooms are a beta feature")} />
        ) : null;

        return (
            <header className={`mx_RoomHeader light-panel ${isInApp ? "mx_RoomHeader_inApp" : ""}`}>
                <div
                    className="mx_RoomHeader_wrapper"
                    aria-owns={this.state.rightPanelOpen ? "mx_RightPanel" : undefined}
                >
                    <AppBackLeftPanelBtn />
                    <div className="mx_RoomHeader_name_topic">
                        <div className="mx_RoomHeader_name_box">
                            <div className="mx_RoomHeader_avatar">{roomAvatar}</div>
                            {name}
                        </div>
                        {topicElement}
                    </div>
                    {betaPill}
                    {buttons}
                </div>
                {!isVideoRoom && <RoomCallBanner roomId={this.props.room.roomId} />}
                <RoomLiveShareWarning roomId={this.props.room.roomId} />
            </header>
        );
    }
}
