/*
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { createRef, ReactNode, SyntheticEvent } from "react";
import classNames from "classnames";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixCall } from "matrix-js-sdk/src/webrtc/call";
import { logger } from "matrix-js-sdk/src/logger";

import { Icon as EmailPillAvatarIcon } from "../../../../../res/img/icon-email-pill-avatar.svg";
import { _t, _td } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import DMRoomMap from "../../../../utils/DMRoomMap";
import SdkConfig from "../../../../SdkConfig";
import { buildActivityScores, buildMemberScores, compareMembers } from "../../../../utils/SortMembers";
import { humanizeTime } from "../../../../utils/humanize";
import { IInviteResult, inviteMultipleToRoom, showInviteResult } from "../../../../RoomInvite";
import { DefaultTagID } from "../../../../stores/room-list/models";
import RoomListStore from "../../../../stores/room-list/RoomListStore";
import OrgStore from "../../../../stores/OrgStore";
import SettingsStore from "../../../../settings/SettingsStore";
import { UIFeature } from "../../../../settings/UIFeature";
import { getHttpUrlFromMxc } from "../../../../customisations/Media";
import BaseAvatar from "../../avatars/BaseAvatar";
import { SearchResultAvatar } from "../../avatars/SearchResultAvatar";
import AccessibleButton, { ButtonEvent } from "../../elements/AccessibleButton";
import Field, { PropShapes, SelectedUserOrRoomTile } from "../../elements/Field";
import TabbedView, { Tab, TabLocation } from "../../../structures/TabbedView";
import Dialpad from "../../voip/DialPad";
import BaseDialog, { DialogProps } from "../BaseDialog";
import DialPadBackspaceButton from "../../elements/DialPadBackspaceButton";
import LegacyCallHandler from "../../../../LegacyCallHandler";
import { ScreenName } from "../../../../PosthogTrackers";
import { KeyBindingAction } from "../../../../accessibility/KeyboardShortcuts";
import { getKeyBindingsManager } from "../../../../KeyBindingsManager";
import { DirectoryMember, Member, startDmOnFirstMessage, ThreepidMember } from "../../../../utils/direct-messages";
import { InviteKind } from "./InviteDialogTypes";
import { privateShouldBeEncrypted } from "../../../../utils/rooms";
import { NonEmptyArray } from "../../../../@types/common";
import { AddressType, getAddressType } from "../../../../UserAddress";
import User from "../../../../utils/User";
import DialogButtons, { DialogButtonProps } from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import ContextMenu, { ChevronFace } from "matrix-react-sdk/src/components/structures/ContextMenu";

// we have a number of types defined from the Matrix spec which can't reasonably be altered here.
/* eslint-disable camelcase */

interface Result {
    userId: string;
    user: Member;
    lastActive?: number;
}

const INITIAL_ROOMS_SHOWN = 3; // Number of rooms to show at first
const INCREMENT_ROOMS_SHOWN = 5; // Number of rooms to add when 'show more' is clicked

enum TabId {
    UserDirectory = "users",
    DialPad = "dialpad",
}

/**
 * Converts a RoomMember to a Member.
 * Returns the Member if it is already a Member.
 */
const toMember = (member: RoomMember | Member): Member => {
    return member instanceof RoomMember
        ? new DirectoryMember({
              user_id: member.userId,
              display_name: member.name,
              avatar_url: member.getMxcAvatarUrl(),
          })
        : member;
};

interface IDMRoomTileProps {
    member: Member;
    lastActiveTs?: number;
    onToggle(member: Member): void;
    highlightWord: string;
    isSelected: boolean;
}

class DMRoomTile extends React.PureComponent<IDMRoomTileProps> {
    private onClick = (e: ButtonEvent): void => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        this.props.onToggle(this.props.member);
    };

    private highlightName(str: string): ReactNode {
        if (!this.props.highlightWord) return str;

        // We convert things to lowercase for index searching, but pull substrings from
        // the submitted text to preserve case. Note: we don't need to htmlEntities the
        // string because React will safely encode the text for us.
        const lowerStr = str.toLowerCase();
        const filterStr = this.props.highlightWord.toLowerCase();

        const result: JSX.Element[] = [];

        let i = 0;
        let ii: number;
        while ((ii = lowerStr.indexOf(filterStr, i)) >= 0) {
            // Push any text we missed (first bit/middle of text)
            if (ii > i) {
                // Push any text we aren't highlighting (middle of text match, or beginning of text)
                result.push(<span key={i + "begin"}>{str.substring(i, ii)}</span>);
            }

            i = ii; // copy over ii only if we have a match (to preserve i for end-of-text matching)

            // Highlight the word the user entered
            const substr = str.substring(i, filterStr.length + i);
            result.push(
                <span className="mx_InviteDialog_tile--room_highlight" key={i + "bold"}>
                    {substr}
                </span>,
            );
            i += substr.length;
        }

        // Push any text we missed (end of text)
        if (i < str.length) {
            result.push(<span key={i + "end"}>{str.substring(i)}</span>);
        }

        return result;
    }

    public render(): React.ReactNode {
        let timestamp: JSX.Element | undefined;
        if (this.props.lastActiveTs) {
            const humanTs = humanizeTime(this.props.lastActiveTs);
            timestamp = (
                <span className="mx_Field_DropdownMenuItem_description mx_InviteDialog_tile--room_time">{humanTs}</span>
            );
        }

        const avatarSize = 24;
        const avatar = (this.props.member as ThreepidMember).isEmail ? (
            <EmailPillAvatarIcon width={avatarSize} height={avatarSize} />
        ) : (
            <BaseAvatar
                url={
                    this.props.member.getMxcAvatarUrl()
                        ? getHttpUrlFromMxc(this.props.member.getMxcAvatarUrl()!, avatarSize)
                        : null
                }
                name={this.props.member.name}
                idName={this.props.member.userId}
                width={avatarSize}
                height={avatarSize}
            />
        );

        let checkmark: JSX.Element | undefined;
        if (this.props.isSelected) {
            // To reduce flickering we put the 'selected' room tile above the real avatar
            checkmark = <div className="mx_InviteDialog_tile--room_selected" />;
        }

        // To reduce flickering we put the checkmark on top of the actual avatar (prevents
        // the browser from reloading the image source when the avatar remounts).
        const stackedAvatar = (
            <span className="mx_InviteDialog_tile_avatarStack">
                {avatar}
                {checkmark}
            </span>
        );

        return (
            <div className="mx_Field_DropdownMenuItem mx_InviteDialog_tile--room" onClick={this.onClick}>
                {stackedAvatar}
                <div className="mx_Field_DropdownMenuItem_title">{this.highlightName(this.props.member.name)}</div>
                {timestamp}
            </div>
        );
    }
}

interface BaseProps {
    // Takes a boolean which is true if a user / users were invited /
    // a call transfer was initiated or false if the dialog was cancelled
    // with no action taken.
    onFinished: (success?: boolean) => void;

    initialText?: string;
    inviteLimit?: number; // 最多邀请几人

    dialogProps?: Partial<DialogProps>;
    dialogButtonsProps?: Partial<DialogButtonProps>;
}

interface InviteDMProps {
    // The kind of invite being performed. Assumed to be InviteKind.Dm if not provided.
    kind?: InviteKind.Dm;
}

interface InviteRoomProps {
    kind: InviteKind.Invite;

    // The room ID this dialog is for. Only required for InviteKind.Invite.
    roomId: string;
}

interface InviteCallProps {
    kind: InviteKind.CallTransfer;

    // The call to transfer. Only required for InviteKind.CallTransfer.
    call: MatrixCall;
}

type InviteProps = InviteDMProps | InviteRoomProps | InviteCallProps;

type Props = InviteProps & BaseProps;

interface IInviteDialogState {
    targets: Member[]; // array of Member objects (see interface above)
    filterText: string;

    consultFirst: boolean;
    dialPadValue: string;
    currentTabId: TabId;

    // These two flags are used for the 'Go' button to communicate what is going on.
    busy: boolean;
    errorText?: string;
}

type InviteInputProps = InviteProps &
    Pick<BaseProps, "initialText" | "inviteLimit"> & {
        busy?: boolean;
        inputFieldProps?: Partial<PropShapes>;
        onTextChange?: (text: string) => void;
        onTargetsChange?: (targets: Member[]) => void;
        roomId?: string;
        call?: MatrixCall;
    };

interface InviteInputState {
    targets: Member[]; // array of Member objects (see interface above)
    filterText: string;

    alreadyInvited: Set<string>;
    recents: Result[];
    numRecentsShown: number;
    suggestions: Result[];
    numSuggestionsShown: number;
    serverResultsMixin: Result[];
    threepidResultsMixin: Result[];

    showSuggestions: boolean;
}

interface SearchInfo {
    userId?: string; // 用户id
    userName?: string; // 用户名
    userOrgId: string; // 用户所在组织id
    userOrgAlias: string; // 用户所在组织别名
}

function isRoomInvite(props: InviteInputProps): props is InviteRoomProps {
    return props.kind === InviteKind.Invite;
}

export class InviteInput extends React.PureComponent<InviteInputProps, InviteInputState> {
    public static defaultProps: Partial<InviteInputProps> = {
        kind: InviteKind.Invite,
        busy: false,
        initialText: "",
    };

    private encryptionByDefault = false;
    private editorRef = createRef<HTMLInputElement>();
    private debounceTimer: number | null = null; // actually number because we're in the browser// 获取当前用户所在组织id

    public constructor(props: InviteInputProps) {
        super(props);

        this.state = {
            targets: [], // array of Member objects (see interface above)
            filterText: this.props.initialText || "",
            alreadyInvited: new Set([]),
            recents: [],
            numRecentsShown: INITIAL_ROOMS_SHOWN,
            suggestions: [],
            numSuggestionsShown: INITIAL_ROOMS_SHOWN,
            serverResultsMixin: [],
            threepidResultsMixin: [],

            showSuggestions: false,
        };
    }

    public componentDidMount(): void {
        this.encryptionByDefault = privateShouldBeEncrypted();

        if (this.props.initialText) {
            this.updateSuggestions(this.props.initialText);
        }
    }

    public componentDidUpdate(prevProps: InviteInputProps, prevState: InviteInputState): void {
        if (this.state.filterText !== prevState.filterText) {
            this.props.onTextChange?.(this.state.filterText);
        }
        if (this.state.targets !== prevState.targets) {
            this.props.onTargetsChange?.(this.state.targets);
        }

        if (this.props.kind === InviteKind.Invite && this.props.roomId && this.props.roomId !== prevProps.roomId) {
            this.generateAlreadyInvited();
        }

        if (this.state.alreadyInvited !== prevState.alreadyInvited) {
            this.setState({
                recents: this.buildRecents(this.state.alreadyInvited),
                suggestions: this.buildSuggestions(this.state.alreadyInvited),
            });
        }
    }

    private generateAlreadyInvited() {
        const alreadyInvited = new Set([MatrixClientPeg.get().getUserId()!]);
        const welcomeUserId = SdkConfig.get("welcome_user_id");
        if (welcomeUserId) alreadyInvited.add(welcomeUserId);

        if (isRoomInvite(this.props)) {
            const room = MatrixClientPeg.get().getRoom(this.props.roomId);
            if (room) {
                room.getMembersWithMembership("invite").forEach((m) => alreadyInvited.add(m.userId));
                room.getMembersWithMembership("join").forEach((m) => alreadyInvited.add(m.userId));
                // add banned users, so we don't try to invite them
                room.getMembersWithMembership("ban").forEach((m) => alreadyInvited.add(m.userId));
            }
        }
        this.setState({
            alreadyInvited,
        });
    }

    public buildRecents(excludedTargetIds: Set<string>): Result[] {
        const rooms = DMRoomMap.shared().getUniqueRoomsWithIndividuals(); // map of userId => js-sdk Room

        // Also pull in all the rooms tagged as DefaultTagID.DM so we don't miss anything. Sometimes the
        // room list doesn't tag the room for the DMRoomMap, but does for the room list.
        const dmTaggedRooms = RoomListStore.instance.orderedLists[DefaultTagID.DM] || [];
        const myUserId = MatrixClientPeg.get().getUserId();
        for (const dmRoom of dmTaggedRooms) {
            const otherMembers = dmRoom.getJoinedMembers().filter((u) => u.userId !== myUserId);
            for (const member of otherMembers) {
                if (rooms[member.userId]) continue; // already have a room

                rooms[member.userId] = dmRoom;
            }
        }

        const recents: {
            userId: string;
            user: Member;
            lastActive: number;
        }[] = [];

        for (const userId in rooms) {
            // Filter out user IDs that are already in the room / should be excluded
            if (excludedTargetIds.has(userId)) {
                continue;
            }

            const room = rooms[userId];
            const roomMember = room.getMember(userId);
            if (!roomMember) {
                // just skip people who don't have memberships for some reason
                continue;
            }

            // Find the last timestamp for a message event
            const searchTypes = ["m.room.message", "m.room.encrypted", "m.sticker"];
            const maxSearchEvents = 20; // to prevent traversing history
            let lastEventTs = 0;
            if (room.timeline && room.timeline.length) {
                for (let i = room.timeline.length - 1; i >= 0; i--) {
                    const ev = room.timeline[i];
                    if (searchTypes.includes(ev.getType())) {
                        lastEventTs = ev.getTs();
                        break;
                    }
                    if (room.timeline.length - i > maxSearchEvents) break;
                }
            }
            if (!lastEventTs) {
                // something weird is going on with this room
                continue;
            }

            recents.push({ userId, user: toMember(roomMember), lastActive: lastEventTs });
        }

        // Sort the recents by last active to save us time later
        recents.sort((a, b) => b.lastActive - a.lastActive);

        return recents;
    }

    private buildSuggestions(excludedTargetIds: Set<string>): { userId: string; user: Member }[] {
        const cli = MatrixClientPeg.get();
        const activityScores = buildActivityScores(cli);
        const memberScores = buildMemberScores(cli);

        const memberComparator = compareMembers(activityScores, memberScores);

        return Object.values(memberScores)
            .map(({ member }) => member)
            .filter((member) => !excludedTargetIds.has(member.userId))
            .sort(memberComparator)
            .map((member) => ({ userId: member.userId, user: toMember(member) }));
    }

    private updateSuggestions = async (term: string): Promise<void> => {
        const results = [];
        const currentOrgId = this.getOrgId();
        const { userId, userName, userOrgId, userOrgAlias } = this.generateSearchUserInfo(term);
        console.log("userOrgId", userOrgId, "userOrgAlias", userOrgAlias);
        if (userId) {
            return;
        } // 如果有用户id，不走查询接口；只有搜索用户名走查询接口
        const name = userName + (userOrgId !== currentOrgId ? `@${userOrgId}` : "");
        fetch(`/heliumos-user-api/user/v1/users?name=${encodeURIComponent(name)}`)
            .then((response) => {
                if (!response.ok) {
                    this.setState({
                        serverResultsMixin: [],
                    });
                    throw response;
                }
                return response.json();
            })
            .then((res) => {
                const data = res.data;
                if (data.length) {
                    for (let i = 0; i < data.length; i++) {
                        const item = data[i];
                        if (item.username) {
                            const cli = MatrixClientPeg.get();
                            const userId = User.instance().generateUserIdByBaseUrl(item.id, cli.baseUrl, userOrgId);
                            results.splice(0, 0, {
                                user_id: userId,
                                display_name: item.display_name || item.username,
                                avatar_url: item.avatar,
                            });
                        }
                    }
                }

                this.setState({
                    showSuggestions: true,
                    serverResultsMixin: results.map((u) => ({
                        userId: u.user_id,
                        user: new DirectoryMember(u),
                    })),
                });
            })
            .catch((error) => {});
    };

    private updateFilter = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const term = e.target.value;
        this.setState({ filterText: term });

        // Debounce server lookups to reduce spam. We don't clear the existing server
        // results because they might still be vaguely accurate, likewise for races which
        // could happen here.
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
            this.updateSuggestions(term);
        }, 500); // 500ms debounce (human reaction time + some)
    };

    private parseFilter(filter: string): string[] {
        return filter
            .split(/[\s,]+/)
            .map((p) => p.trim())
            .filter((p) => !!p); // filter empty strings
    }

    private convertFilter(): Member[] {
        // Check to see if there's anything to convert first
        if (!this.state.filterText || getAddressType(this.state.filterText) !== AddressType.MatrixUserId)
            return this.state.targets || [];

        if (!this.canInviteMore()) {
            // There should only be one third-party invite → do not allow more targets
            return this.state.targets;
        }

        let newMember: Member | undefined;
        if (this.state.filterText.startsWith("@")) {
            // Assume mxid
            newMember = new DirectoryMember({ user_id: this.state.filterText });
        } else if (SettingsStore.getValue(UIFeature.IdentityServer)) {
            // Assume email
            if (this.canInviteThirdParty()) {
                newMember = new ThreepidMember(this.state.filterText);
            }
        }
        if (!newMember) return this.state.targets;

        const newTargets = [...(this.state.targets || []), newMember];
        this.setState({ targets: newTargets, filterText: "" });
        return newTargets;
    }

    /**
     * If encryption by default is enabled, third-party invites should be encrypted as well.
     * For encryption to work, the other side requires a device.
     * To achieve this Element implements a waiting room until all have joined.
     * Waiting for many users degrades the UX → only one email invite is allowed at a time.
     *
     * @param targets - Optional member list to check. Uses targets from state if not provided.
     */
    private canInviteMore(targets?: (Member | RoomMember)[]): boolean {
        targets = targets || this.state.targets;
        return this.canInviteThirdParty(targets) || !targets.some((t) => t instanceof ThreepidMember);
    }

    /**
     * A third-party invite is possible if
     * - this is a non-DM dialog or
     * - there are no invites yet or
     * - encryption by default is not enabled
     *
     * Also see {@link InviteDialog#canInviteMore}.
     *
     * @param targets - Optional member list to check. Uses targets from state if not provided.
     */
    private canInviteThirdParty(targets?: (Member | RoomMember)[]): boolean {
        targets = targets || this.state.targets;
        return this.props.kind !== InviteKind.Dm || targets.length === 0 || !this.encryptionByDefault;
    }

    private getOrgId(): string {
        return OrgStore.sharedInstance().getCurrentOrgId();
    }

    // 生成搜索用户信息
    private generateSearchUserInfo(searchUser: string): SearchInfo {
        const currentOrgId = this.getOrgId(); // 当前用户所在组织id

        let userId,
            userName,
            userOrgId, // 所查询的用户所属的组织id
            userOrgAlias; // 所查询的用户所属的组织别名
        if (!searchUser.includes("@")) {
            // 查询时不包含@，例如test_dyp，默认从当前服务查询
            userName = searchUser;
            userOrgId = currentOrgId;
        } else if (getAddressType(searchUser) === AddressType.MatrixUserId) {
            // @userId:matrix.system.service.orgId
            let chatServer;
            [userId, chatServer] = searchUser.split("@")[1].split(":");
            userOrgId = chatServer.split(".").pop();
        } else {
            // userName@orgAlias
            [userName, userOrgAlias] = searchUser.split("@");
        }

        // 补齐信息
        if (userOrgAlias && !userOrgId) {
            userOrgId = OrgStore.sharedInstance().getOrgIdByAlias(userOrgAlias);
        } else if (userOrgId && !userOrgAlias) {
            userOrgAlias = OrgStore.sharedInstance().getOrgAliasById(userOrgId);
        }
        console.log("generateSearchUser  result", {
            userId,
            userName,
            userOrgId,
            userOrgAlias,
        });

        return {
            userId,
            userName,
            userOrgId,
            userOrgAlias,
        };
    }
    private showMoreRecents = (): void => {
        this.setState({ numRecentsShown: this.state.numRecentsShown + INCREMENT_ROOMS_SHOWN });
    };

    private showMoreSuggestions = (): void => {
        this.setState({ numSuggestionsShown: this.state.numSuggestionsShown + INCREMENT_ROOMS_SHOWN });
    };

    private toggleMember = (member: Member): void => {
        if (!this.props.busy) {
            let filterText = this.state.filterText;
            let targets = this.state.targets.map((t) => t); // cheap clone for mutation
            const idx = targets.indexOf(member);
            if (idx >= 0) {
                targets.splice(idx, 1);
            } else {
                if (this.props.kind === InviteKind.CallTransfer && targets.length > 0) {
                    targets = [];
                }
                targets.push(member);
                filterText = ""; // clear the filter when the user accepts a suggestion
            }
            if (this.props.inviteLimit) {
                targets = targets.slice(-this.props.inviteLimit);
            }
            this.setState({ targets, filterText, showSuggestions: false });

            if (this.editorRef && this.editorRef.current) {
                this.editorRef.current.focus();
            }
        }
    };

    private removeMember = (member: Member): void => {
        const targets = this.state.targets.map((t) => t); // cheap clone for mutation
        const idx = targets.indexOf(member);
        if (idx >= 0) {
            targets.splice(idx, 1);
            this.setState({ targets });
        }

        if (this.editorRef && this.editorRef.current) {
            this.editorRef.current.focus();
        }
    };

    private onClickInputArea = (e: React.MouseEvent): void => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        if (this.editorRef && this.editorRef.current) {
            this.editorRef.current.focus();
        }
    };

    private onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (this.props.busy) return;

        let handled = false;
        const value = e.currentTarget.value.trim();
        const action = getKeyBindingsManager().getAccessibilityAction(e);

        switch (action) {
            case KeyBindingAction.Backspace:
                if (value || this.state.targets.length <= 0) break;

                // when the field is empty and the user hits backspace remove the right-most target
                this.removeMember(this.state.targets[this.state.targets.length - 1]);
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
        }
    };

    private renderEditor(): JSX.Element {
        let targets;
        if (this.state.targets.length > 0) {
            targets = this.state.targets.map((t) => (
                <SelectedUserOrRoomTile
                    key={t.userId}
                    avatar={<SearchResultAvatar user={t} size={20} />}
                    name={t.name}
                    onRemove={() => !this.props.busy && this.removeMember(t)}
                />
            ));
        }

        return (
            <div ref={this.editorRef} className="mx_InviteDialog_editor" onClick={this.onClickInputArea}>
                <Field
                    type="text"
                    usePlaceholderAsHint={!targets}
                    placeholder={_t("Enter username")}
                    label={_t("Username")}
                    className={
                        !!this.props.inviteLimit && targets.length >= this.props.inviteLimit ? "mx_Field_hideInput" : ""
                    }
                    autoFocus={false}
                    autoComplete="off"
                    disabled={
                        this.props.busy || (this.props.kind == InviteKind.CallTransfer && this.state.targets.length > 0)
                    }
                    prefixComponent={targets}
                    hasPrefixContainer={false}
                    value={this.state.filterText}
                    onKeyDown={this.onKeyDown}
                    onChange={this.updateFilter}
                    {...this.props.inputFieldProps}
                />
            </div>
        );
    }

    private renderSection(kind: "recents" | "suggestions"): ReactNode {
        if (!this.state.showSuggestions) return null;

        let sourceMembers = kind === "recents" ? this.state.recents : this.state.suggestions;
        let showNum = kind === "recents" ? this.state.numRecentsShown : this.state.numSuggestionsShown;
        const showMoreFn = kind === "recents" ? this.showMoreRecents.bind(this) : this.showMoreSuggestions.bind(this);
        const lastActive = (m: Result): number | undefined => (kind === "recents" ? m.lastActive : undefined);

        // Mix in the server results if we have any, but only if we're searching. We track the additional
        // members separately because we want to filter sourceMembers but trust the mixin arrays to have
        // the right members in them.
        let priorityAdditionalMembers: Result[] = []; // Shows up before our own suggestions, higher quality
        let otherAdditionalMembers: Result[] = []; // Shows up after our own suggestions, lower quality
        const hasMixins = this.state.serverResultsMixin || this.state.threepidResultsMixin;
        if (this.state.filterText && hasMixins && kind === "suggestions") {
            // We don't want to duplicate members though, so just exclude anyone we've already seen.
            // The type of u is a pain to define but members of both mixins have the 'userId' property
            const notAlreadyExists = (u: any): boolean => {
                return (
                    // !sourceMembers.some((m) => m.userId === u.userId) &&
                    !priorityAdditionalMembers.some((m) => m.userId === u.userId) &&
                    !otherAdditionalMembers.some((m) => m.userId === u.userId)
                );
            };

            otherAdditionalMembers = this.state.serverResultsMixin.filter(notAlreadyExists);
            priorityAdditionalMembers = this.state.threepidResultsMixin.filter(notAlreadyExists);
        }

        // // Hide the section if there's nothing to filter by
        // const hasAdditionalMembers = priorityAdditionalMembers.length > 0 || otherAdditionalMembers.length > 0;
        // if (sourceMembers.length === 0 && !hasAdditionalMembers) return null;

        if (!this.canInviteThirdParty()) {
            // It is currently not allowed to add more third-party invites. Filter them out.
            priorityAdditionalMembers = priorityAdditionalMembers.filter((s) => s instanceof ThreepidMember);
        }

        // Do some simple filtering on the input before going much further. If we get no results, say so.
        if (this.state.filterText) {
            const filterBy = this.state.filterText.toLowerCase();
            sourceMembers = sourceMembers.filter((m) => m.user.name.toLowerCase().includes(filterBy));
        }

        // Now we mix in the additional members. Again, we presume these have already been filtered. We
        // also assume they are more relevant than our suggestions and prepend them to the list.
        if (kind === "suggestions") {
            if (this.state.filterText) {
                sourceMembers = [...this.state.serverResultsMixin];
            } else {
                sourceMembers = [];
            }
        } else {
            sourceMembers = [...priorityAdditionalMembers, ...sourceMembers, ...otherAdditionalMembers];
        }

        // If we're going to hide one member behind 'show more', just use up the space of the button
        // with the member's tile instead.
        if (showNum === sourceMembers.length - 1) showNum++;

        // .slice() will return an incomplete array but won't error on us if we go too far
        const toRender = sourceMembers.slice(0, showNum);
        const hasMore = toRender.length < sourceMembers.length;

        let showMore: JSX.Element | undefined;
        if (hasMore) {
            showMore = (
                <div className="mx_InviteDialog_section_showMore">
                    <AccessibleButton onClick={showMoreFn} kind="link">
                        {_t("Show more")}
                    </AccessibleButton>
                </div>
            );
        }

        if (!this.editorRef.current) return null;

        const { width, bottom, left } = this.editorRef.current.getBoundingClientRect();
        return (
            <ContextMenu
                hasBackground={false}
                chevronFace={ChevronFace.None}
                top={bottom + 4}
                left={left}
                menuWidth={width}
            >
                <div className="mx_Field_DropdownMenuWrap">
                    <div className="mx_Field_DropdownMenuInner">
                        {!toRender.length ? (
                            <p className="mx_Field_DropdownMenu_noResults">{_t("No results")}</p>
                        ) : (
                            <div className="mx_Field_DropdownMenuList">
                                {toRender.map((r) => (
                                    <DMRoomTile
                                        member={r.user}
                                        lastActiveTs={lastActive(r)}
                                        key={r.user.userId}
                                        onToggle={this.toggleMember}
                                        highlightWord={this.state.filterText}
                                        isSelected={this.state.targets.some((t) => t.userId === r.userId)}
                                    />
                                ))}
                                {showMore}
                            </div>
                        )}
                    </div>
                </div>
            </ContextMenu>
        );
    }

    render() {
        return (
            <React.Fragment>
                <div className="mx_InviteDialog_addressBar">{this.renderEditor()}</div>
                {this.renderSection("suggestions")}
            </React.Fragment>
        );
    }
}

export default class InviteDialog extends React.PureComponent<Props, IInviteDialogState> {
    public static defaultProps: Partial<Props> = {
        kind: InviteKind.Dm,
        initialText: "",
    };

    private numberEntryFieldRef: React.RefObject<Field> = createRef();

    public constructor(props: Props) {
        super(props);

        this.state = {
            targets: [], // array of Member objects (see interface above)
            filterText: "",

            consultFirst: false,
            dialPadValue: "",
            currentTabId: TabId.UserDirectory,

            // These two flags are used for the 'Go' button to communicate what is going on.
            busy: false,
        };
    }

    private onConsultFirstChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ consultFirst: ev.target.checked });
    };

    private shouldAbortAfterInviteError(result: IInviteResult, room: Room): boolean {
        this.setState({ busy: false });
        const userMap = new Map<string, Member>(this.state.targets.map((member) => [member.userId, member]));
        return !showInviteResult(result.states, room, result.inviter, userMap);
    }

    private startDm = async (): Promise<void> => {
        this.setState({
            busy: true,
        });

        try {
            const cli = MatrixClientPeg.get();
            await startDmOnFirstMessage(cli, this.state.targets);
            this.props.onFinished(true);
        } catch (err) {
            logger.error(err);
            this.setState({
                busy: false,
                errorText: _t("We couldn't create your DM."),
            });
        }
    };

    private inviteUsers = async (): Promise<void> => {
        if (this.props.kind !== InviteKind.Invite) return;
        this.setState({ busy: true });
        const targetIds = this.state.targets.map((t) => t.userId);

        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.roomId);
        if (!room) {
            logger.error("Failed to find the room to invite users to");
            this.setState({
                busy: false,
                errorText: _t("Something went wrong trying to invite the users."),
            });
            return;
        }

        try {
            const result = await inviteMultipleToRoom(this.props.roomId, targetIds, true);
            this.props.onFinished(true);
            this.shouldAbortAfterInviteError(result, room);
        } catch (err) {
            logger.error(err);
            this.setState({
                busy: false,
                errorText: _t(
                    "We couldn't invite those users. Please check the users you want to invite and try again.",
                ),
            });
        }
    };

    private transferCall = async (): Promise<void> => {
        if (this.props.kind !== InviteKind.CallTransfer) return;
        if (this.state.currentTabId == TabId.UserDirectory) {
            const targetIds = this.state.targets.map((t) => t.userId);
            if (targetIds.length > 1) {
                this.setState({
                    errorText: _t("A call can only be transferred to a single user."),
                });
                return;
            }

            LegacyCallHandler.instance.startTransferToMatrixID(this.props.call, targetIds[0], this.state.consultFirst);
        } else {
            LegacyCallHandler.instance.startTransferToPhoneNumber(
                this.props.call,
                this.state.dialPadValue,
                this.state.consultFirst,
            );
        }
        this.props.onFinished(true);
    };

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private onDialFormSubmit = (ev: SyntheticEvent): void => {
        ev.preventDefault();
        this.transferCall();
    };

    private onDialChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ dialPadValue: ev.currentTarget.value });
    };

    private onDigitPress = (digit: string, ev: ButtonEvent): void => {
        this.setState({ dialPadValue: this.state.dialPadValue + digit });

        // Keep the number field focused so that keyboard entry is still available
        // However, don't focus if this wasn't the result of directly clicking on the button,
        // i.e someone using keyboard navigation.
        if (ev.type === "click") {
            this.numberEntryFieldRef.current?.focus();
        }
    };

    private onDeletePress = (ev: ButtonEvent): void => {
        if (this.state.dialPadValue.length === 0) return;
        this.setState({ dialPadValue: this.state.dialPadValue.slice(0, -1) });

        // Keep the number field focused so that keyboard entry is still available
        // However, don't focus if this wasn't the result of directly clicking on the button,
        // i.e someone using keyboard navigation.
        if (ev.type === "click") {
            this.numberEntryFieldRef.current?.focus();
        }
    };

    private onTabChange = (tabId: TabId): void => {
        this.setState({ currentTabId: tabId });
    };

    private get screenName(): ScreenName | undefined {
        switch (this.props.kind) {
            case InviteKind.Dm:
                return "StartChat";
        }
    }

    private onTextChange = (text: string) => {
        this.setState({
            filterText: text,
        });
    };

    private onTargetsChange = (targets: Member[]) => {
        this.setState({
            targets,
        });
    };

    public render(): React.ReactNode {
        let goButtonFn;
        let consultConnectSection;

        const hasSelection =
            this.state.targets.length > 0 || getAddressType(this.state.filterText) === AddressType.MatrixUserId;

        if (this.props.kind === InviteKind.Dm) {
            goButtonFn = this.startDm;
        } else if (this.props.kind === InviteKind.Invite) {
            goButtonFn = this.inviteUsers;
        } else if (this.props.kind === InviteKind.CallTransfer) {
            consultConnectSection = (
                <div className="mx_InviteDialog_transferConsultConnect">
                    <label>
                        <input type="checkbox" checked={this.state.consultFirst} onChange={this.onConsultFirstChange} />
                        {_t("Consult first")}
                    </label>
                    <AccessibleButton
                        kind="secondary"
                        onClick={this.onCancel}
                        className="mx_InviteDialog_transferConsultConnect_pushRight"
                    >
                        {_t("Cancel")}
                    </AccessibleButton>
                    <AccessibleButton
                        kind="primary"
                        onClick={this.transferCall}
                        className="mx_InviteDialog_transferButton"
                        disabled={!hasSelection && this.state.dialPadValue === ""}
                    >
                        {_t("Transfer")}
                    </AccessibleButton>
                </div>
            );
        }

        const usersSection = (
            <InviteInput
                kind={this.props.kind}
                roomId={this.props.roomId}
                initialText={this.props.initialText}
                inviteLimit={this.props.inviteLimit}
                busy={this.state.busy}
                onTextChange={this.onTextChange}
                onTargetsChange={this.onTargetsChange}
            />
        );

        let dialogContent;
        if (this.props.kind === InviteKind.CallTransfer) {
            const tabs: NonEmptyArray<Tab> = [
                new Tab(TabId.UserDirectory, _td("User Directory"), "mx_InviteDialog_userDirectoryIcon", usersSection),
            ];

            const backspaceButton = <DialPadBackspaceButton onBackspacePress={this.onDeletePress} />;

            // Only show the backspace button if the field has content
            let dialPadField;
            if (this.state.dialPadValue.length !== 0) {
                dialPadField = (
                    <Field
                        ref={this.numberEntryFieldRef}
                        className="mx_InviteDialog_dialPadField"
                        id="dialpad_number"
                        value={this.state.dialPadValue}
                        autoFocus={true}
                        onChange={this.onDialChange}
                        postfixComponent={backspaceButton}
                    />
                );
            } else {
                dialPadField = (
                    <Field
                        ref={this.numberEntryFieldRef}
                        className="mx_InviteDialog_dialPadField"
                        id="dialpad_number"
                        value={this.state.dialPadValue}
                        autoFocus={true}
                        onChange={this.onDialChange}
                    />
                );
            }

            const dialPadSection = (
                <div className="mx_InviteDialog_dialPad">
                    <form onSubmit={this.onDialFormSubmit}>{dialPadField}</form>
                    <Dialpad hasDial={false} onDigitPress={this.onDigitPress} onDeletePress={this.onDeletePress} />
                </div>
            );
            tabs.push(new Tab(TabId.DialPad, _td("Dial pad"), "mx_InviteDialog_dialPadIcon", dialPadSection));
            dialogContent = (
                <React.Fragment>
                    <TabbedView
                        tabs={tabs}
                        initialTabId={this.state.currentTabId}
                        tabLocation={TabLocation.TOP}
                        onChange={this.onTabChange}
                    />
                    {consultConnectSection}
                </React.Fragment>
            );
        } else {
            dialogContent = <React.Fragment>{usersSection}</React.Fragment>;
        }

        const dialogFooter = (
            <DialogButtons
                primaryButton={_t("Invite")}
                primaryButtonProps={{
                    loading: this.state.busy,
                    disabled: this.state.busy || !hasSelection,
                }}
                onPrimaryButtonClick={goButtonFn}
                cancelButton={_t("Cancel")}
                onCancel={this.onCancel}
                {...this.props.dialogButtonsProps}
            />
        );

        return (
            <BaseDialog
                className={classNames({
                    mx_InviteDialog_transfer: this.props.kind === InviteKind.CallTransfer,
                    mx_InviteDialog_other: this.props.kind !== InviteKind.CallTransfer,
                })}
                hasCancel={true}
                title={_t("Invite people")}
                description={"邀请自己的同事或者好友加入。"}
                onFinished={this.onCancel}
                footer={dialogFooter}
                screenName={this.screenName}
                {...this.props.dialogProps}
            >
                <div className="mx_InviteDialog_content">{dialogContent}</div>
            </BaseDialog>
        );
    }
}
