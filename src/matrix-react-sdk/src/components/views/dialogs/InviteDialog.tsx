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

import { Icon as InfoIcon } from "../../../../res/img/element-icons/info.svg";
import { Icon as EmailPillAvatarIcon } from "../../../../res/img/icon-email-pill-avatar.svg";
import { _t, _td } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import {
    // getHostnameFromMatrixServerName,
    // getServerName,
    makeRoomPermalink,
    makeUserPermalink,
} from "../../../utils/permalinks/Permalinks";
import DMRoomMap from "../../../utils/DMRoomMap";
import SdkConfig from "../../../SdkConfig";
import * as Email from "../../../email";
import { getDefaultIdentityServerUrl, setToDefaultIdentityServer } from "../../../utils/IdentityServerUtils";
import { buildActivityScores, buildMemberScores, compareMembers } from "../../../utils/SortMembers";
import { abbreviateUrl } from "../../../utils/UrlUtils";
// import IdentityAuthClient from "../../../IdentityAuthClient";
import { humanizeTime } from "../../../utils/humanize";
import { IInviteResult, inviteMultipleToRoom, showAnyInviteErrors } from "../../../RoomInvite";
import { Action } from "../../../dispatcher/actions";
import { DefaultTagID } from "../../../stores/room-list/models";
import RoomListStore from "../../../stores/room-list/RoomListStore";
import OrgStore from "../../../stores/OrgStore";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import {getHttpUrlFromMxc} from "../../../customisations/Media";
import BaseAvatar from "../avatars/BaseAvatar";
import { SearchResultAvatar } from "../avatars/SearchResultAvatar";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
// import { selectText } from "../../../utils/strings";
import Field from "../elements/Field";
import TabbedView, { Tab, TabLocation } from "../../structures/TabbedView";
import Dialpad from "../voip/DialPad";
import QuestionDialog from "./QuestionDialog";
import Spinner from "../elements/Spinner";
import BaseDialog from "./BaseDialog";
import DialPadBackspaceButton from "../elements/DialPadBackspaceButton";
import LegacyCallHandler from "../../../LegacyCallHandler";
// import UserIdentifierCustomisations from "../../../customisations/UserIdentifier";
// import CopyableText from "../elements/CopyableText";
import { ScreenName } from "../../../PosthogTrackers";
import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import {
    DirectoryMember,
    IDMUserTileProps,
    Member,
    startDmOnFirstMessage,
    ThreepidMember,
} from "../../../utils/direct-messages";
import { InviteKind } from "./InviteDialogTypes";
import Modal from "../../../Modal";
import dis from "../../../dispatcher/dispatcher";
import { privateShouldBeEncrypted } from "../../../utils/rooms";
import { NonEmptyArray } from "../../../@types/common";
import {AddressType, getAddressType} from "../../../UserAddress";
import User from "../../../utils/User";

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

class DMUserTile extends React.PureComponent<IDMUserTileProps> {
    private onRemove = (e: ButtonEvent): void => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        this.props.onRemove!(this.props.member);
    };

    public render(): React.ReactNode {
        const avatarSize = 20;
        const avatar = <SearchResultAvatar user={this.props.member} size={avatarSize} />;

        let closeButton;
        if (this.props.onRemove) {
            closeButton = (
                <AccessibleButton className="mx_InviteDialog_userTile_remove" onClick={this.onRemove}>
                    <img
                        src={require("../../../../res/img/icon-pill-remove.svg").default}
                        alt={_t("Remove")}
                        width={8}
                        height={8}
                    />
                </AccessibleButton>
            );
        }

        return (
            <span className="mx_InviteDialog_userTile">
                <span className="mx_InviteDialog_userTile_pill">
                    {avatar}
                    <span className="mx_InviteDialog_userTile_name">{this.props.member.name}</span>
                </span>
                {closeButton}
            </span>
        );
    }
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
            timestamp = <span className="mx_InviteDialog_tile--room_time">{humanTs}</span>;
        }

        const avatarSize = 36;
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

        // const userIdentifier = UserIdentifierCustomisations.getDisplayUserIdentifier(this.props.member.userId, {
        //     withDisplayName: true,
        // });

        // const caption = (this.props.member as ThreepidMember).isEmail
        //     ? _t("Invite by email")
        //     : this.highlightName(userIdentifier || this.props.member.userId);

        return (
            <div className="mx_InviteDialog_tile mx_InviteDialog_tile--room" onClick={this.onClick}>
                {stackedAvatar}
                <span className="mx_InviteDialog_tile_nameStack">
                    <div className="mx_InviteDialog_tile_nameStack_name">
                        {this.highlightName(this.props.member.name)}
                    </div>
                    {/* <div className="mx_InviteDialog_tile_nameStack_userId">{caption}</div> */}
                </span>
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

    // Initial value to populate the filter with
    initialText?: string;
}

interface InviteDMProps extends BaseProps {
    // The kind of invite being performed. Assumed to be InviteKind.Dm if not provided.
    kind?: InviteKind.Dm;
}

interface InviteRoomProps extends BaseProps {
    kind: InviteKind.Invite;

    // The room ID this dialog is for. Only required for InviteKind.Invite.
    roomId: string;
}

function isRoomInvite(props: Props): props is InviteRoomProps {
    return props.kind === InviteKind.Invite;
}

interface InviteCallProps extends BaseProps {
    kind: InviteKind.CallTransfer;

    // The call to transfer. Only required for InviteKind.CallTransfer.
    call: MatrixCall;
}

type Props = InviteDMProps | InviteRoomProps | InviteCallProps;

interface IInviteDialogState {
    targets: Member[]; // array of Member objects (see interface above)
    filterText: string;
    recents: Result[];
    numRecentsShown: number;
    suggestions: Result[];
    numSuggestionsShown: number;
    serverResultsMixin: Result[];
    threepidResultsMixin: Result[];
    canUseIdentityServer: boolean;
    tryingIdentityServer: boolean;
    consultFirst: boolean;
    dialPadValue: string;
    currentTabId: TabId;

    // These two flags are used for the 'Go' button to communicate what is going on.
    busy: boolean;
    errorText?: string;
}

interface SearchInfo {
    userId?: string; // 用户id
    userName?: string; // 用户名
    userOrgId: string; // 用户所在组织id
    userOrgAlias: string; // 用户所在组织别名
}

export default class InviteDialog extends React.PureComponent<Props, IInviteDialogState> {
    public static defaultProps: Partial<Props> = {
        kind: InviteKind.Dm,
        initialText: "",
    };

    private debounceTimer: number | null = null; // actually number because we're in the browser
    private editorRef = createRef<HTMLInputElement>();
    private numberEntryFieldRef: React.RefObject<Field> = createRef();
    private unmounted = false;
    private encryptionByDefault = false;

    public constructor(props: Props) {
        super(props);

        if (props.kind === InviteKind.Invite && !props.roomId) {
            throw new Error("When using InviteKind.Invite a roomId is required for an InviteDialog");
        } else if (props.kind === InviteKind.CallTransfer && !props.call) {
            throw new Error("When using InviteKind.CallTransfer a call is required for an InviteDialog");
        }

        const alreadyInvited = new Set([MatrixClientPeg.get().getUserId()!]);
        const welcomeUserId = SdkConfig.get("welcome_user_id");
        if (welcomeUserId) alreadyInvited.add(welcomeUserId);

        if (isRoomInvite(props)) {
            const room = MatrixClientPeg.get().getRoom(props.roomId);
            if (!room) throw new Error("Room ID given to InviteDialog does not look like a room");
            room.getMembersWithMembership("invite").forEach((m) => alreadyInvited.add(m.userId));
            room.getMembersWithMembership("join").forEach((m) => alreadyInvited.add(m.userId));
            // add banned users, so we don't try to invite them
            room.getMembersWithMembership("ban").forEach((m) => alreadyInvited.add(m.userId));
        }

        this.state = {
            targets: [], // array of Member objects (see interface above)
            filterText: this.props.initialText || "",
            recents: InviteDialog.buildRecents(alreadyInvited),
            numRecentsShown: INITIAL_ROOMS_SHOWN,
            suggestions: this.buildSuggestions(alreadyInvited),
            numSuggestionsShown: INITIAL_ROOMS_SHOWN,
            serverResultsMixin: [],
            threepidResultsMixin: [],
            canUseIdentityServer: !!MatrixClientPeg.get().getIdentityServerUrl(),
            tryingIdentityServer: false,
            consultFirst: false,
            dialPadValue: "",
            currentTabId: TabId.UserDirectory,

            // These two flags are used for the 'Go' button to communicate what is going on.
            busy: false,
        };
    }

    public componentDidMount(): void {
        this.encryptionByDefault = privateShouldBeEncrypted();

        if (this.props.initialText) {
            this.updateSuggestions(this.props.initialText);
        }
    }

    public componentWillUnmount(): void {
        this.unmounted = true;
    }

    private onConsultFirstChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ consultFirst: ev.target.checked });
    };

    public static buildRecents(excludedTargetIds: Set<string>): Result[] {
        const rooms = DMRoomMap.shared().getUniqueRoomsWithIndividuals(); // map of userId => js-sdk Room

        // Also pull in all the rooms tagged as DefaultTagID.DM so we don't miss anything. Sometimes the
        // room list doesn't tag the room for the DMRoomMap, but does for the room list.
        const dmTaggedRooms = RoomListStore.instance.orderedLists[DefaultTagID.DM] || [];
        const myUserId = MatrixClientPeg.get().getUserId();
        for (const dmRoom of dmTaggedRooms) {
            const otherMembers = dmRoom.getJoinedMembers().filter((u) => u.userId !== myUserId);
            for (const member of otherMembers) {
                if (rooms[member.userId]) continue; // already have a room

                logger.warn(`Adding DM room for ${member.userId} as ${dmRoom.roomId} from tag, not DM map`);
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
                logger.warn(`[Invite:Recents] Excluding ${userId} from recents`);
                continue;
            }

            const room = rooms[userId];
            const roomMember = room.getMember(userId);
            if (!roomMember) {
                // just skip people who don't have memberships for some reason
                logger.warn(`[Invite:Recents] ${userId} is missing a member object in their own DM (${room.roomId})`);
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
                logger.warn(`[Invite:Recents] ${userId} (${room.roomId}) has a weird last timestamp: ${lastEventTs}`);
                continue;
            }

            recents.push({ userId, user: toMember(roomMember), lastActive: lastEventTs });
        }
        if (!recents) logger.warn("[Invite:Recents] No recents to suggest!");

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

    private shouldAbortAfterInviteError(result: IInviteResult, room: Room): boolean {
        this.setState({ busy: false });
        const userMap = new Map<string, Member>(this.state.targets.map((member) => [member.userId, member]));
        return !showAnyInviteErrors(result.states, room, result.inviter, userMap);
    }

    // 获取当前用户所在组织id
    private getOrgId(): string {
        return OrgStore.sharedInstance().getCurrentOrgId();
    }

    // 生成搜索用户信息
    private generateSearchUserInfo(searchUser: string): SearchInfo {
        const currentOrgId = this.getOrgId(); // 当前用户所在组织id

        let userId,
            userName,
            userOrgId,  // 所查询的用户所属的组织id
            userOrgAlias; // 所查询的用户所属的组织别名
        if (!searchUser.includes("@")) {
            // 查询时不包含@，例如test_dyp，默认从当前服务查询
            userName = searchUser;
            userOrgId = currentOrgId;
        } else if (getAddressType(searchUser) === AddressType.MatrixUserId) {
            // @userId:matrix.system.service.orgId
            let chatServer;
            [userId, chatServer] = searchUser.split('@')[1].split(':');
            userOrgId = chatServer.split('.').pop();
        } else {
            // userName@orgAlias
            [userName, userOrgAlias] = searchUser.split('@');
        }

        // 补齐信息
        if (userOrgAlias && !userOrgId) {
            userOrgId = OrgStore.sharedInstance().getOrgIdByAlias(userOrgAlias);
        } else if (userOrgId && !userOrgAlias) {
            userOrgAlias = OrgStore.sharedInstance().getOrgAliasById(userOrgId);
        }
        console.log('generateSearchUser  result', {
            userId,
            userName,
            userOrgId,
            userOrgAlias
        });

        return {
            userId,
            userName,
            userOrgId,
            userOrgAlias
        };
    }

    private convertFilter(): Member[] {
        console.log('!!!!!enter convertFilter');
        // Check to see if there's anything to convert first
        if (!this.state.filterText || getAddressType(this.state.filterText) !== AddressType.MatrixUserId) return this.state.targets || [];

        console.log('!!!!!this.canInviteMore()', this.canInviteMore());
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
            console.log('!!!!this.canInviteThirdParty()', this.canInviteThirdParty());
            if (this.canInviteThirdParty()) {
                newMember = new ThreepidMember(this.state.filterText);
            }
        }
        if (!newMember) return this.state.targets;

        const newTargets = [...(this.state.targets || []), newMember];
        this.setState({ targets: newTargets, filterText: "" });
        return newTargets;
    }

    private startDm = async (): Promise<void> => {
        this.setState({
            busy: true,
        });

        try {
            const cli = MatrixClientPeg.get();
            const targets = this.convertFilter();
            console.log('!!!!!targets', targets);
            await startDmOnFirstMessage(cli, targets);
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
        this.convertFilter();
        const targets = this.convertFilter();
        const targetIds = targets.map((t) => t.userId);

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
            if (!this.shouldAbortAfterInviteError(result, room)) {
                // handles setting error message too
                this.props.onFinished(true);
            }
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
            this.convertFilter();
            const targets = this.convertFilter();
            const targetIds = targets.map((t) => t.userId);
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

    private onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (this.state.busy) return;

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
            case KeyBindingAction.Space:
                if (!value || !value.includes("@") || value.includes(" ")) break;

                // when the user hits space and their input looks like an e-mail/MXID then try to convert it
                this.convertFilter();
                handled = true;
                break;
            case KeyBindingAction.Enter:
                if (!value) break;

                // when the user hits enter with something in their field try to convert it
                this.convertFilter();
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
        }
    };

    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    private updateSuggestions = async (term: string): Promise<void> => {
        const results = [];
        const currentOrgId = this.getOrgId();
        const { userId, userName, userOrgId, userOrgAlias } = this.generateSearchUserInfo(term);
        console.log('userOrgId', userOrgId, 'userOrgAlias', userOrgAlias);
        if (!!userId) { return; } // 如果有用户id，不走查询接口；只有搜索用户名走查询接口
        const name = userName + (userOrgId !== currentOrgId ? `@${userOrgId}` : '');
        fetch(`/heliumos-user-api/user/v1/users?name=${encodeURIComponent(name)}`)
            .then((response) => response.json())
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
                    serverResultsMixin: results.map((u) => ({
                        userId: u.user_id,
                        user: new DirectoryMember(u),
                    })),
                });
            });

        // MatrixClientPeg.get()
        //     .searchUserDirectory({ term })
        //     .then(async (r): Promise<void> => {
        //         if (term !== this.state.filterText) {
        //             // Discard the results - we were probably too slow on the server-side to make
        //             // these results useful. This is a race we want to avoid because we could overwrite
        //             // more accurate results.
        //             return;
        //         }

        //         if (!r.results) r.results = [];

        //         const mxUserId = localStorage.getItem("mx_user_id");
        //         const serverName = mxUserId.split(":").splice(1).join();
        //         fetch(`/heliumos-user-api/api/v1/users?name=${encodeURIComponent(term)}`)
        //             .then((response) => response.json())
        //             .then((res) => {
        //                 const data = res.data;
        //                 if (data.length) {
        //                     for (let i = 0; i < data.length; i++) {
        //                         const item = data[i];
        //                         if (item.username) {
        //                             const userId = `@${item.id}:${serverName}`;
        //                             r.results.splice(0, 0, {
        //                                 user_id: userId,
        //                                 display_name: item.display_name || item.username,
        //                                 avatar_url: null,
        //                             });
        //                         }
        //                     }
        //                 }

        //                 this.setState({
        //                     serverResultsMixin: r.results.map((u) => ({
        //                         userId: u.user_id,
        //                         user: new DirectoryMember(u),
        //                     })),
        //                 });
        //             });

        //         // While we're here, try and autocomplete a search result for the mxid itself
        //         // if there's no matches (and the input looks like a mxid).
        //         // if (term[0] === "@" && term.indexOf(":") > 1) {
        //         //     try {
        //         //         const profile = await MatrixClientPeg.get().getProfileInfo(term);
        //         //         if (profile) {
        //         //             // If we have a profile, we have enough information to assume that
        //         //             // the mxid can be invited - add it to the list. We stick it at the
        //         //             // top so it is most obviously presented to the user.
        //         //             r.results.splice(0, 0, {
        //         //                 user_id: term,
        //         //                 display_name: profile["displayname"],
        //         //                 avatar_url: profile["avatar_url"],
        //         //             });
        //         //         }
        //         //     } catch (e) {
        //         //         logger.warn("Non-fatal error trying to make an invite for a user ID");
        //         //         logger.warn(e);

        //         //         // Reuse logic from Permalinks as a basic MXID validity check
        //         //         const serverName = getServerName(term);
        //         //         const domain = getHostnameFromMatrixServerName(serverName);
        //         //         if (domain) {
        //         //             // Add a result anyways, just without a profile. We stick it at the
        //         //             // top so it is most obviously presented to the user.
        //         //             r.results.splice(0, 0, {
        //         //                 user_id: term,
        //         //                 display_name: term,
        //         //             });
        //         //         }
        //         //     }
        //         // }

        //         // this.setState({
        //         //     serverResultsMixin: r.results.map((u) => ({
        //         //         userId: u.user_id,
        //         //         user: new DirectoryMember(u),
        //         //     })),
        //         // });
        //     })
        //     .catch((e) => {
        //         logger.error("Error searching user directory:");
        //         logger.error(e);
        //         this.setState({ serverResultsMixin: [] }); // clear results because it's moderately fatal
        //     });

        // Whenever we search the directory, also try to search the identity server. It's
        // all debounced the same anyways.
        // if (!this.state.canUseIdentityServer) {
        //     // The user doesn't have an identity server set - warn them of that.
        //     this.setState({ tryingIdentityServer: true });
        //     return;
        // }
        // if (Email.looksValid(term) && this.canInviteThirdParty() && SettingsStore.getValue(UIFeature.IdentityServer)) {
        //     // Start off by suggesting the plain email while we try and resolve it
        //     // to a real account.
        //     this.setState({
        //         // per above: the userId is a lie here - it's just a regular identifier
        //         threepidResultsMixin: [{ user: new ThreepidMember(term), userId: term }],
        //     });
        //     try {
        //         const authClient = new IdentityAuthClient();
        //         const token = await authClient.getAccessToken();
        //         // No token → unable to try a lookup
        //         if (!token) return;

        //         if (term !== this.state.filterText) return; // abandon hope

        //         const lookup = await MatrixClientPeg.get().lookupThreePid("email", term, token);
        //         if (term !== this.state.filterText) return; // abandon hope

        //         if (!lookup || !lookup.mxid) {
        //             // We weren't able to find anyone - we're already suggesting the plain email
        //             // as an alternative, so do nothing.
        //             return;
        //         }

        //         // We append the user suggestion to give the user an option to click
        //         // the email anyways, and so we don't cause things to jump around. In
        //         // theory, the user would see the user pop up and think "ah yes, that
        //         // person!"
        //         const profile = await MatrixClientPeg.get().getProfileInfo(lookup.mxid);
        //         if (term !== this.state.filterText || !profile) return; // abandon hope
        //         this.setState({
        //             threepidResultsMixin: [
        //                 ...this.state.threepidResultsMixin,
        //                 {
        //                     user: new DirectoryMember({
        //                         user_id: lookup.mxid,
        //                         display_name: profile.displayname,
        //                         avatar_url: profile.avatar_url,
        //                     }),
        //                     // Use the search term as identifier, so that it shows up in suggestions.
        //                     userId: term,
        //                 },
        //             ],
        //         });
        //     } catch (e) {
        //         logger.error("Error searching identity server:");
        //         logger.error(e);
        //         this.setState({ threepidResultsMixin: [] }); // clear results because it's moderately fatal
        //     }
        // }
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

    private showMoreRecents = (): void => {
        this.setState({ numRecentsShown: this.state.numRecentsShown + INCREMENT_ROOMS_SHOWN });
    };

    private showMoreSuggestions = (): void => {
        this.setState({ numSuggestionsShown: this.state.numSuggestionsShown + INCREMENT_ROOMS_SHOWN });
    };

    private toggleMember = (member: Member): void => {
        if (!this.state.busy) {
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
            this.setState({ targets, filterText });

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

    private parseFilter(filter: string): string[] {
        return filter
            .split(/[\s,]+/)
            .map((p) => p.trim())
            .filter((p) => !!p); // filter empty strings
    }

    private onPaste = async (e: React.ClipboardEvent): Promise<void> => {
        if (this.state.filterText) {
            // if the user has already typed something, just let them
            // paste normally.
            return;
        }

        // Prevent the text being pasted into the input
        e.preventDefault();

        // Process it as a list of addresses to add instead
        const text = e.clipboardData.getData("text");
        const possibleMembers = [
            // If we can avoid hitting the profile endpoint, we should.
            ...this.state.recents,
            ...this.state.suggestions,
            ...this.state.serverResultsMixin,
            ...this.state.threepidResultsMixin,
        ];
        const toAdd: Member[] = [];
        const failed: string[] = [];

        // Addresses that could not be added.
        // Will be displayed as filter text to provide feedback.
        const unableToAddMore: string[] = [];

        const potentialAddresses = this.parseFilter(text);

        for (const address of potentialAddresses) {
            const member = possibleMembers.find((m) => m.userId === address);
            if (member) {
                if (this.canInviteMore([...this.state.targets, ...toAdd])) {
                    toAdd.push(member.user);
                } else {
                    // Invite not possible for current targets and pasted targets.
                    unableToAddMore.push(address);
                }
                continue;
            }

            if (Email.looksValid(address)) {
                if (this.canInviteThirdParty([...this.state.targets, ...toAdd])) {
                    toAdd.push(new ThreepidMember(address));
                } else {
                    // Third-party invite not possible for current targets and pasted targets.
                    unableToAddMore.push(address);
                }
                continue;
            }

            if (address[0] !== "@") {
                failed.push(address); // not a user ID
                continue;
            }

            try {
                const profile = await MatrixClientPeg.get().getProfileInfo(address);
                toAdd.push(
                    new DirectoryMember({
                        user_id: address,
                        display_name: profile?.displayname,
                        avatar_url: profile?.avatar_url,
                    }),
                );
            } catch (e) {
                logger.error("Error looking up profile for " + address);
                logger.error(e);
                failed.push(address);
            }
        }
        if (this.unmounted) return;

        if (failed.length > 0) {
            Modal.createDialog(QuestionDialog, {
                title: _t("Failed to find the following users"),
                description: _t(
                    "The following users might not exist or are invalid, and cannot be invited: %(csvNames)s",
                    { csvNames: failed.join(", ") },
                ),
                button: _t("OK"),
            });
        }

        if (unableToAddMore) {
            this.setState({
                filterText: unableToAddMore.join(" "),
                targets: [...this.state.targets, ...toAdd],
            });
        } else {
            this.setState({
                targets: [...this.state.targets, ...toAdd],
            });
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

    private onUseDefaultIdentityServerClick = (e: ButtonEvent): void => {
        e.preventDefault();

        // Update the IS in account data. Actually using it may trigger terms.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        setToDefaultIdentityServer();
        this.setState({ canUseIdentityServer: true, tryingIdentityServer: false });
    };

    private onManageSettingsClick = (e: ButtonEvent): void => {
        e.preventDefault();
        dis.fire(Action.ViewUserSettings);
        this.props.onFinished(false);
    };

    private renderSection(kind: "recents" | "suggestions"): ReactNode {
        let sourceMembers = kind === "recents" ? this.state.recents : this.state.suggestions;
        let showNum = kind === "recents" ? this.state.numRecentsShown : this.state.numSuggestionsShown;
        const showMoreFn = kind === "recents" ? this.showMoreRecents.bind(this) : this.showMoreSuggestions.bind(this);
        const lastActive = (m: Result): number | undefined => (kind === "recents" ? m.lastActive : undefined);
        let sectionName = kind === "recents" ? _t("Recent Conversations") : _t("Suggestions");

        if (this.props.kind === InviteKind.Invite) {
            sectionName = kind === "recents" ? _t("Recently Direct Messaged") : _t("Suggestions");
        }

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
        const hasAdditionalMembers = priorityAdditionalMembers.length > 0 || otherAdditionalMembers.length > 0;

        // Hide the section if there's nothing to filter by
        if (sourceMembers.length === 0 && !hasAdditionalMembers) return null;

        if (!this.canInviteThirdParty()) {
            // It is currently not allowed to add more third-party invites. Filter them out.
            priorityAdditionalMembers = priorityAdditionalMembers.filter((s) => s instanceof ThreepidMember);
        }

        // Do some simple filtering on the input before going much further. If we get no results, say so.
        if (this.state.filterText) {
            const filterBy = this.state.filterText.toLowerCase();
            sourceMembers = sourceMembers.filter((m) => m.user.name.toLowerCase().includes(filterBy));

            if (sourceMembers.length === 0 && !hasAdditionalMembers) {
                return (
                    <div className="mx_InviteDialog_section">
                        <h3>{sectionName}</h3>
                        <p>{_t("No results")}</p>
                    </div>
                );
            }
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

        const tiles = toRender.map((r) => (
            <DMRoomTile
                member={r.user}
                lastActiveTs={lastActive(r)}
                key={r.user.userId}
                onToggle={this.toggleMember}
                highlightWord={this.state.filterText}
                isSelected={this.state.targets.some((t) => t.userId === r.userId)}
            />
        ));
        return (
            <div className="mx_InviteDialog_section">
                <h3>{sectionName}</h3>
                {tiles}
                {showMore}
            </div>
        );
    }

    private renderEditor(): JSX.Element {
        const hasPlaceholder =
            this.props.kind == InviteKind.CallTransfer &&
            this.state.targets.length === 0 &&
            this.state.filterText.length === 0;
        const targets = this.state.targets.map((t) => (
            <DMUserTile member={t} onRemove={this.state.busy ? undefined : this.removeMember} key={t.userId} />
        ));
        const input = (
            <input
                type="text"
                onKeyDown={this.onKeyDown}
                onChange={this.updateFilter}
                value={this.state.filterText}
                ref={this.editorRef}
                onPaste={this.onPaste}
                autoFocus={true}
                disabled={
                    this.state.busy || (this.props.kind == InviteKind.CallTransfer && this.state.targets.length > 0)
                }
                autoComplete="off"
                placeholder={hasPlaceholder ? _t("Search") : undefined}
                data-testid="invite-dialog-input"
            />
        );
        return (
            <div className="mx_InviteDialog_editor" onClick={this.onClickInputArea}>
                {targets}
                {input}
            </div>
        );
    }

    private renderIdentityServerWarning(): ReactNode {
        if (
            !this.state.tryingIdentityServer ||
            this.state.canUseIdentityServer ||
            !SettingsStore.getValue(UIFeature.IdentityServer)
        ) {
            return null;
        }

        const defaultIdentityServerUrl = getDefaultIdentityServerUrl();
        if (defaultIdentityServerUrl) {
            return (
                <div className="mx_InviteDialog_identityServer">
                    {_t(
                        "Use an identity server to invite by email. " +
                            "<default>Use the default (%(defaultIdentityServerName)s)</default> " +
                            "or manage in <settings>Settings</settings>.",
                        {
                            defaultIdentityServerName: abbreviateUrl(defaultIdentityServerUrl),
                        },
                        {
                            default: (sub) => (
                                <AccessibleButton kind="link_inline" onClick={this.onUseDefaultIdentityServerClick}>
                                    {sub}
                                </AccessibleButton>
                            ),
                            settings: (sub) => (
                                <AccessibleButton kind="link_inline" onClick={this.onManageSettingsClick}>
                                    {sub}
                                </AccessibleButton>
                            ),
                        },
                    )}
                </div>
            );
        } else {
            return (
                <div className="mx_InviteDialog_identityServer">
                    {_t(
                        "Use an identity server to invite by email. " + "Manage in <settings>Settings</settings>.",
                        {},
                        {
                            settings: (sub) => (
                                <AccessibleButton kind="link_inline" onClick={this.onManageSettingsClick}>
                                    {sub}
                                </AccessibleButton>
                            ),
                        },
                    )}
                </div>
            );
        }
    }

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

    // private async onLinkClick(e: React.MouseEvent<HTMLAnchorElement>): Promise<void> {
    //     e.preventDefault();
    //     selectText(e.currentTarget);
    // }

    private get screenName(): ScreenName | undefined {
        switch (this.props.kind) {
            case InviteKind.Dm:
                return "StartChat";
        }
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

    private hasFilterAtLeastOneEmail(): boolean {
        if (!this.state.filterText) return false;

        return this.parseFilter(this.state.filterText).some((address: string) => {
            return Email.looksValid(address);
        });
    }

    public render(): React.ReactNode {
        let spinner: JSX.Element | undefined;
        if (this.state.busy) {
            spinner = <Spinner w={20} h={20} />;
        }

        let title;
        let helpText;
        let buttonText;
        let goButtonFn;
        let consultConnectSection;
        let extraSection;
        let footer;
        let keySharingWarning = <span />;

        const identityServersEnabled = SettingsStore.getValue(UIFeature.IdentityServer);

        const hasSelection =
            this.state.targets.length > 0 || getAddressType(this.state.filterText) === AddressType.MatrixUserId;

        const cli = MatrixClientPeg.get();
        const userId = cli.getUserId()!;
        if (this.props.kind === InviteKind.Dm) {
            title = _t("Direct Messages");

            if (identityServersEnabled) {
                helpText = _t(
                    "Start a conversation with someone using their name, email address or username.",
                    {},
                    {
                        // userId: () => {
                        //     return (
                        //         <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">
                        //             {userId}
                        //         </a>
                        //     );
                        // },
                    },
                );
            } else {
                helpText = _t(
                    "Start a conversation with someone using their name or username.",
                    {},
                    {
                        // userId: () => {
                        //     return (
                        //         <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">
                        //             {userId}
                        //         </a>
                        //     );
                        // },
                    },
                );
            }

            buttonText = _t("Go");
            goButtonFn = this.startDm;
            extraSection = (
                <div className="mx_InviteDialog_section_hidden_suggestions_disclaimer">
                    <span>{_t("Some suggestions may be hidden for privacy.")}</span>
                    <p>{_t("If you can't see who you're looking for, send them your invite link below.")}</p>
                </div>
            );
            // const link = makeUserPermalink(MatrixClientPeg.get().getUserId()!);
            footer = (
                <></>
                // <div className="mx_InviteDialog_footer">
                //     <h3>{_t("Or send invite link")}</h3>
                //     <CopyableText getTextToCopy={() => makeUserPermalink(MatrixClientPeg.get().getUserId()!)}>
                //         <a href={link} onClick={this.onLinkClick}>
                //             {link}
                //         </a>
                //     </CopyableText>
                // </div>
            );
        } else if (this.props.kind === InviteKind.Invite) {
            const roomId = this.props.roomId;
            const room = MatrixClientPeg.get()?.getRoom(roomId);
            const isSpace = room?.isSpaceRoom();
            title = isSpace
                ? _t("Invite to %(spaceName)s", {
                      spaceName: room?.name || _t("Unnamed Space"),
                  })
                : _t("Invite to %(roomName)s", {
                      roomName: room?.name || _t("Unnamed Room"),
                  });

            let helpTextUntranslated;
            if (isSpace) {
                if (identityServersEnabled) {
                    helpTextUntranslated = _td(
                        "Invite someone using their name, email address, username " +
                            "or <a>share this space</a>.",
                    );
                } else {
                    helpTextUntranslated = _td(
                        "Invite someone using their name, username " + "or <a>share this space</a>.",
                    );
                }
            } else {
                if (identityServersEnabled) {
                    helpTextUntranslated = _td(
                        "Invite someone using their name, email address, username " +
                            "or <a>share this room</a>.",
                    );
                } else {
                    helpTextUntranslated = _td(
                        "Invite someone using their name, username " + "or <a>share this room</a>.",
                    );
                }
            }

            helpText = _t(
                helpTextUntranslated,
                {},
                {
                    // userId: () => (
                    //     <a href={makeUserPermalink(userId)} rel="noreferrer noopener" target="_blank">
                    //         {userId}
                    //     </a>
                    // ),
                    a: (sub) => (
                        <a href={makeRoomPermalink(roomId)} rel="noreferrer noopener" target="_blank">
                            {sub}
                        </a>
                    ),
                },
            );

            buttonText = _t("Invite");
            goButtonFn = this.inviteUsers;

            if (cli.isRoomEncrypted(this.props.roomId)) {
                const room = cli.getRoom(this.props.roomId)!;
                const visibilityEvent = room.currentState.getStateEvents("m.room.history_visibility", "");
                const visibility =
                    visibilityEvent && visibilityEvent.getContent() && visibilityEvent.getContent().history_visibility;
                if (visibility === "world_readable" || visibility === "shared") {
                    keySharingWarning = (
                        <p className="mx_InviteDialog_helpText">
                            <InfoIcon height={14} width={14} />
                            {" " + _t("Invited people will be able to read old messages.")}
                        </p>
                    );
                }
            }
        } else if (this.props.kind === InviteKind.CallTransfer) {
            title = _t("Transfer");

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

        const goButton =
            this.props.kind == InviteKind.CallTransfer ? null : (
                <AccessibleButton
                    kind="primary"
                    onClick={goButtonFn}
                    className="mx_InviteDialog_goButton"
                    disabled={this.state.busy || !hasSelection}
                >
                    {buttonText}
                </AccessibleButton>
            );

        let results: React.ReactNode | null = null;
        let onlyOneThreepidNote: React.ReactNode | null = null;

        if (!this.canInviteMore() || (this.hasFilterAtLeastOneEmail() && !this.canInviteThirdParty())) {
            // We are in DM case here, because of the checks in canInviteMore() / canInviteThirdParty().
            onlyOneThreepidNote = (
                <div className="mx_InviteDialog_oneThreepid">
                    {_t("Invites by email can only be sent one at a time")}
                </div>
            );
        } else {
            results = (
                <div className="mx_InviteDialog_userSections">
                    {this.renderSection("recents")}
                    {this.renderSection("suggestions")}
                    {extraSection}
                </div>
            );
        }

        const usersSection = (
            <React.Fragment>
                <p className="mx_InviteDialog_helpText">{helpText}</p>
                <div className="mx_InviteDialog_addressBar">
                    {this.renderEditor()}
                    <div className="mx_InviteDialog_buttonAndSpinner">
                        {goButton}
                        {spinner}
                    </div>
                </div>
                {keySharingWarning}
                {this.renderIdentityServerWarning()}
                <div className="error">{this.state.errorText}</div>
                {onlyOneThreepidNote}
                {results}
                {footer}
            </React.Fragment>
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
            dialogContent = (
                <React.Fragment>
                    {usersSection}
                    {consultConnectSection}
                </React.Fragment>
            );
        }

        return (
            <BaseDialog
                className={classNames({
                    mx_InviteDialog_transfer: this.props.kind === InviteKind.CallTransfer,
                    mx_InviteDialog_other: this.props.kind !== InviteKind.CallTransfer,
                    mx_InviteDialog_hasFooter: !!footer,
                })}
                hasCancel={true}
                onFinished={this.props.onFinished}
                title={title}
                screenName={this.screenName}
            >
                <div className="mx_InviteDialog_content">{dialogContent}</div>
            </BaseDialog>
        );
    }
}
