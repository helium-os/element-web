/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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

import React, { createRef } from "react";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { RoomState, RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { logger } from "matrix-js-sdk/src/logger";
import { throttle } from "lodash";

import { _t, _td } from "../../../../../languageHandler";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import AccessibleButton, { ButtonEvent } from "../../../elements/AccessibleButton";
import Modal from "../../../../../Modal";
import ErrorDialog from "../../../dialogs/ErrorDialog";
import SettingsStore from "../../../../../settings/SettingsStore";
import { VoiceBroadcastInfoEventType } from "../../../../../voice-broadcast";
import { ElementCall } from "../../../../../models/Call";
import SearchBox from "matrix-react-sdk/src/components/structures/SearchBox";
import MemberList from "matrix-react-sdk/src/components/views/rooms/MemberList";
import MemberTile from "matrix-react-sdk/src/components/views/rooms/MemberTile";
import { ContextMenuButton } from "matrix-react-sdk/src/accessibility/context_menu/ContextMenuButton";
import IconizedContextMenu, {
    IconizedContextMenuOptionList,
    IconizedContextMenuOption,
} from "matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu";
import { aboveLeftOf } from "matrix-react-sdk/src/components/structures/ContextMenu";
import { PowerLabel, PowerLevel, StateEventType } from "matrix-react-sdk/src/powerLevel";
import AutoHideScrollbar from "matrix-react-sdk/src/components/structures/AutoHideScrollbar";
import DropdownButton from "matrix-react-sdk/src/components/views/elements/DropdownButton";
import RemoveUserDialog from "matrix-react-sdk/src/components/views/dialogs/RemoveMemberDialog";
import { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import withRoomPermissions from "matrix-react-sdk/src/hocs/withRoomPermissions";

interface IEventShowOpts {
    isState?: boolean;
    hideForSpace?: boolean;
    hideForRoom?: boolean;
}

interface IPowerLevelDescriptor {
    desc: string;
    defaultValue: number;
    hideForSpace?: boolean;
}

const plEventsToShow: Record<string, IEventShowOpts> = {
    // If an event is listed here, it will be shown in the PL settings. Defaults will be calculated.
    [EventType.RoomAvatar]: { isState: true },
    [EventType.RoomName]: { isState: true },
    [EventType.RoomCanonicalAlias]: { isState: true },
    [EventType.SpaceChild]: { isState: true, hideForRoom: true },
    [EventType.RoomHistoryVisibility]: { isState: true, hideForSpace: true },
    [EventType.RoomPowerLevels]: { isState: true },
    [EventType.RoomTopic]: { isState: true },
    [EventType.RoomTombstone]: { isState: true, hideForSpace: true },
    [EventType.RoomEncryption]: { isState: true, hideForSpace: true },
    [EventType.RoomServerAcl]: { isState: true, hideForSpace: true },
    [EventType.RoomPinnedEvents]: { isState: true, hideForSpace: true },
    [EventType.Reaction]: { isState: false, hideForSpace: true },
    [EventType.RoomRedaction]: { isState: false, hideForSpace: true },

    // MSC3401: Native Group VoIP signaling
    [ElementCall.CALL_EVENT_TYPE.name]: { isState: true, hideForSpace: true },
    [ElementCall.MEMBER_EVENT_TYPE.name]: { isState: true, hideForSpace: true },

    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    "im.vector.modular.widgets": { isState: true, hideForSpace: true },
    [VoiceBroadcastInfoEventType]: { isState: true, hideForSpace: true },
};

// parse a string as an integer; if the input is undefined, or cannot be parsed
// as an integer, return a default.
function parseIntWithDefault(val: string, def: number): number {
    const res = parseInt(val);
    return isNaN(res) ? def : res;
}

interface IBannedUserProps {
    canUnban?: boolean;
    member: RoomMember;
    by: string;
    reason?: string;
}

export class BannedUser extends React.Component<IBannedUserProps> {
    private onUnbanClick = (): void => {
        MatrixClientPeg.get()
            .unban(this.props.member.roomId, this.props.member.userId)
            .catch((err) => {
                logger.error("Failed to unban: " + err);
                Modal.createDialog(ErrorDialog, {
                    title: _t("Error"),
                    description: _t("Failed to unban"),
                });
            });
    };

    public render(): React.ReactNode {
        let unbanButton;

        if (this.props.canUnban) {
            unbanButton = (
                <AccessibleButton
                    className="mx_RolesRoomSettingsTab_unbanBtn"
                    kind="danger_sm"
                    onClick={this.onUnbanClick}
                >
                    {_t("Unban")}
                </AccessibleButton>
            );
        }

        const userId = this.props.member.name === this.props.member.userId ? null : this.props.member.userId;
        return (
            <li>
                {unbanButton}
                <span title={_t("Banned by %(displayName)s", { displayName: this.props.by })}>
                    <strong>{this.props.member.name}</strong> {userId}
                    {this.props.reason ? " " + _t("Reason") + ": " + this.props.reason : ""}
                </span>
            </li>
        );
    }
}

interface BaseProps {
    roomId: string;
}

interface IProps extends BaseProps {
    canChangePowerLevels: boolean;
    canKickMember: boolean;
}

interface IState {
    searchQuery: string;
    showContextMenu: boolean;
    contextMenuBtn: Element | null;
    selectedMember: RoomMember;
}

const options = [PowerLevel.Admin, PowerLevel.Moderator];

const changeMemberPermissionBtnClassName = "mx_RoleSettings_changeMemberPermission";

class RolesRoomSettingsTab extends React.Component<IProps, IState> {
    private memberListRef = createRef<HTMLDivElement>();
    public constructor(props: IProps) {
        super(props);
        this.state = {
            searchQuery: "",
            showContextMenu: false,
            contextMenuBtn: null,
            selectedMember: null,
        };
    }

    public componentDidMount(): void {
        MatrixClientPeg.get().on(RoomStateEvent.Update, this.onRoomStateUpdate);
    }

    public componentWillUnmount(): void {
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener(RoomStateEvent.Update, this.onRoomStateUpdate);
        }
    }

    private onRoomStateUpdate = (state: RoomState): void => {
        if (state.roomId !== this.props.roomId) return;
        this.onThisRoomMembership();
    };

    private onThisRoomMembership = throttle(
        () => {
            this.forceUpdate();
        },
        200,
        { leading: true, trailing: true },
    );

    private populateDefaultPlEvents(
        eventsSection: Record<string, number>,
        stateLevel: number,
        eventsLevel: number,
    ): void {
        for (const desiredEvent of Object.keys(plEventsToShow)) {
            if (!(desiredEvent in eventsSection)) {
                eventsSection[desiredEvent] = plEventsToShow[desiredEvent].isState ? stateLevel : eventsLevel;
            }
        }
    }

    private changeUserPowerLevel = (value: number, powerLevelKey: string): Promise<ISendEventResponse> => {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");
        let plContent = plEvent?.getContent() ?? {};

        // Clone the power levels just in case
        plContent = Object.assign({}, plContent);

        // powerLevelKey should be a user ID
        if (!plContent["users"]) plContent["users"] = {};
        plContent["users"][powerLevelKey] = value;

        return client.sendStateEvent(this.props.roomId, EventType.RoomPowerLevels, plContent);
    };

    private onRemoveMember = (userId: string) => {
        if (!userId) return;

        Modal.createDialog(RemoveUserDialog, {
            roomId: this.props.roomId,
            userId,
        });
    };

    private onSearchQueryChanged = (searchQuery: string) => {
        this.setState({
            searchQuery,
        });
    };

    private onShowMenu = (member: RoomMember) => {
        this.setState({
            showContextMenu: true,
            contextMenuBtn: this.memberListRef.current?.querySelector(
                `.${changeMemberPermissionBtnClassName}[data-uid="${member.userId}"]`,
            ),
            selectedMember: member,
        });
    };

    private onCloseMenu = () => {
        this.setState({
            showContextMenu: false,
            contextMenuBtn: null,
            selectedMember: null,
        });
    };

    private makeMemberTiles = (members: Array<RoomMember>): JSX.Element[] => {
        return members
            .sort((a, b) => b.getPowerLevel() - a.getPowerLevel())
            .map((m) => {
                const client = MatrixClientPeg.get();
                const room = client.getRoom(this.props.roomId);

                const plContent = room?.currentState.getPowerLevels();
                const userLevels = plContent.users || {};
                const memberLevel = userLevels[m.userId] || PowerLevel.Default;

                const myUserId = client.getUserId();
                const isMe = m.userId === myUserId;
                const myUserLevel = userLevels[myUserId];

                // 社区内拥有修改用户角色权限的用户
                const canChangeLevelsUsers = Object.keys(userLevels).filter(
                    (userId) => room?.currentState.maySendStateEvent(EventType.RoomPowerLevels, userId),
                );

                const canChangeMemberLevels =
                    this.props.canChangePowerLevels && // 当前用户拥有修改社区内用户角色的权限
                    (myUserLevel > memberLevel || // 如果当前用户的level > 某个用户的level，则当前用户可以修改该用户的角色权限
                        (isMe && canChangeLevelsUsers.length > 1)); // 如果是当前用户，必须保证当前社区内拥有修改角色权限的用户数 > 1时，才允许当前用户修改自己的角色权限

                const isSelected = this.state.selectedMember?.userId === m.userId;

                return (
                    <div key={m.userId} className={`mx_MemberItem ${isSelected ? "mx_MemberItem_active" : ""}`}>
                        <MemberTile member={m} avatarSize={24} showPresence={false} />
                        <ul className="mx_RoleSettings_memberItem_actions">
                            {canChangeMemberLevels && (
                                <li className={changeMemberPermissionBtnClassName} data-uid={m.userId}>
                                    <ContextMenuButton
                                        isExpanded={this.state.showContextMenu && isSelected}
                                        onClick={(ev: ButtonEvent) => this.onShowMenu(m)}
                                    >
                                        <DropdownButton>角色修改</DropdownButton>
                                    </ContextMenuButton>
                                </li>
                            )}
                            {/*只能移除比当前用户自身权利低的用户*/}
                            {!isMe && myUserLevel > memberLevel && this.props.canKickMember && (
                                <li onClick={() => this.onRemoveMember(m.userId)}>{_t("Remove users")}</li>
                            )}
                        </ul>
                    </div>
                );
            });
    };

    private async onChangeMemberPower(powerLevel: number, e: ButtonEvent) {
        if (!this.state.selectedMember) return;

        e.stopPropagation();

        try {
            await this.changeUserPowerLevel(powerLevel, this.state.selectedMember.userId);
        } catch (error) {
            Modal.createDialog(ErrorDialog, {
                title: _t("Error changing power level"),
                description: _t(
                    "An error occurred changing the user's power level. Ensure you have sufficient " +
                        "permissions and try again.",
                ),
            });
        } finally {
            this.onCloseMenu();
        }
    }

    private renderContextMenu = () => {
        if (!this.state.showContextMenu || !this.state.contextMenuBtn || !this.state.selectedMember) return null;

        const rect = this.state.contextMenuBtn?.getBoundingClientRect();
        if (!rect) return null;

        return (
            <IconizedContextMenu compact {...aboveLeftOf(rect)} menuWidth={130} onFinished={this.onCloseMenu}>
                <IconizedContextMenuOptionList first>
                    {options.map((powerLevel) => {
                        const isMatch = this.state.selectedMember.getPowerLevel() === powerLevel;
                        return (
                            <IconizedContextMenuOption
                                key={powerLevel}
                                label={`${isMatch ? "取消" : "设置成"}${_t(PowerLabel[powerLevel])}`}
                                onClick={(e: ButtonEvent) =>
                                    this.onChangeMemberPower(isMatch ? PowerLevel.Default : powerLevel, e)
                                }
                            />
                        );
                    })}
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    };

    public render(): React.ReactNode {
        const client = MatrixClientPeg.get();
        const room = client.getRoom(this.props.roomId);
        const isSpaceRoom = room?.isSpaceRoom();

        const plEvent = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "");
        const plContent = plEvent ? plEvent.getContent() || {} : {};

        const plEventsToLabels: Record<EventType | string, string | null> = {
            // These will be translated for us later.
            [EventType.RoomAvatar]: isSpaceRoom ? _td("Change space avatar") : _td("Change room avatar"),
            [EventType.RoomName]: isSpaceRoom ? _td("Change space name") : _td("Change room name"),
            [EventType.RoomCanonicalAlias]: isSpaceRoom
                ? _td("Change main address for the space")
                : _td("Change main address for the room"),
            [EventType.SpaceChild]: _td("Manage rooms in this space"),
            [EventType.RoomHistoryVisibility]: _td("Change history visibility"),
            [EventType.RoomPowerLevels]: _td("Change permissions"),
            [EventType.RoomTopic]: isSpaceRoom ? _td("Change description") : _td("Change topic"),
            [EventType.RoomTombstone]: _td("Upgrade the room"),
            [EventType.RoomEncryption]: _td("Enable room encryption"),
            [EventType.RoomServerAcl]: _td("Change server ACLs"),
            [EventType.Reaction]: _td("Send reactions"),
            [EventType.RoomRedaction]: _td("Remove messages sent by me"),

            // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
            "im.vector.modular.widgets": isSpaceRoom ? null : _td("Modify widgets"),
            [VoiceBroadcastInfoEventType]: _td("Voice broadcasts"),
        };

        if (SettingsStore.getValue("feature_pinning")) {
            plEventsToLabels[EventType.RoomPinnedEvents] = _td("Manage pinned events");
        }
        // MSC3401: Native Group VoIP signaling
        if (SettingsStore.getValue("feature_group_calls")) {
            plEventsToLabels[ElementCall.CALL_EVENT_TYPE.name] = _td("Start %(brand)s calls");
            plEventsToLabels[ElementCall.MEMBER_EVENT_TYPE.name] = _td("Join %(brand)s calls");
        }

        const powerLevelDescriptors: Record<string, IPowerLevelDescriptor> = {
            users_default: {
                desc: _t("Default role"),
                defaultValue: 0,
            },
            events_default: {
                desc: _t("Send messages"),
                defaultValue: 0,
                hideForSpace: true,
            },
            invite: {
                desc: _t("Invite users"),
                defaultValue: 0,
            },
            state_default: {
                desc: _t("Change settings"),
                defaultValue: 50,
            },
            kick: {
                desc: _t("Remove users"),
                defaultValue: 50,
            },
            ban: {
                desc: _t("Ban users"),
                defaultValue: 50,
            },
            redact: {
                desc: _t("Remove messages sent by others"),
                defaultValue: 50,
                hideForSpace: true,
            },
            "notifications.room": {
                desc: _t("Notify everyone"),
                defaultValue: 50,
                hideForSpace: true,
            },
        };

        const eventsLevels = plContent.events || {};

        this.populateDefaultPlEvents(
            eventsLevels,
            parseIntWithDefault(plContent.state_default, powerLevelDescriptors.state_default.defaultValue),
            parseIntWithDefault(plContent.events_default, powerLevelDescriptors.events_default.defaultValue),
        );

        // hide the power level selector for enabling E2EE if it the room is already encrypted
        if (client.isRoomEncrypted(this.props.roomId)) {
            delete eventsLevels[EventType.RoomEncryption];
        }

        return (
            <>
                <div className="mx_SettingsTab_section mx_RolesRoomSettings_container">
                    <div className="mx_RolesRoomSettings_search">
                        <SearchBox
                            placeholder={_t("Search")}
                            onSearch={this.onSearchQueryChanged}
                            initialValue={this.state.searchQuery}
                        />
                    </div>
                    <div className="mx_RolesSettings_membersWrap" ref={this.memberListRef}>
                        <AutoHideScrollbar>
                            <MemberList
                                roomId={this.props.roomId}
                                searchQuery={this.state.searchQuery}
                                makeMemberTiles={this.makeMemberTiles}
                            />
                        </AutoHideScrollbar>
                    </div>
                    <div className="mx_RolesSettings_tips">
                        <span className="mx_tips_icon" />
                        协管员拥有除分配角色、删除社区以外的所有权限。
                    </div>
                </div>
                {this.renderContextMenu()}
            </>
        );
    }
}

export default withRoomPermissions<BaseProps>(RolesRoomSettingsTab, {
    canChangePowerLevels: {
        eventType: EventType.RoomPowerLevels,
        state: false,
    },
    canKickMember: {
        eventType: StateEventType.Kick,
        state: true,
    },
});
