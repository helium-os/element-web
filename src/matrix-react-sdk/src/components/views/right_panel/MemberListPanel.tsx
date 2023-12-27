/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017, 2018 New Vector Ltd
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import BaseCard from "./BaseCard";
import MemberTile from "../rooms/MemberTile";
import { toLeftOf } from "matrix-react-sdk/src/components/structures/ContextMenu";
import SendDMContextMenu from "matrix-react-sdk/src/components/views/context_menus/SendDMContextMenu";
import MemberList from "matrix-react-sdk/src/components/views/rooms/MemberList";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu";
import { _t } from "matrix-react-sdk/src/languageHandler";
import Modal from "matrix-react-sdk/src/Modal";
import RemoveUserDialog from "matrix-react-sdk/src/components/views/dialogs/RemoveMemberDialog";
import { contextMenuBelow, PartialDOMRect } from "matrix-react-sdk/src/components/views/rooms/RoomTile";

interface IProps {
    roomId: string;
    onClose(): void;
}

interface IState {
    showContextMenu: boolean;
    contextMenuBtn: Element | null;
    showSendDMContextMenu: boolean;
    selectedMember: RoomMember;
    generalMenuPosition: PartialDOMRect | null;
}

export default class MemberListPanel extends React.Component<IProps, IState> {
    private memberListRef = createRef<HTMLDivElement>();
    private readonly showPresence: boolean = false;

    public constructor(props: IProps) {
        super(props);
        this.state = {
            showContextMenu: false,
            showSendDMContextMenu: false,
            selectedMember: null,
            contextMenuBtn: null,
            generalMenuPosition: null,
        };
    }

    public componentDidMount(): void {}

    public componentWillUnmount(): void {}

    private onShowSendDMContextMenu = (member, e) => {
        e.stopPropagation();

        this.setState({
            showSendDMContextMenu: true,
            selectedMember: member,
            contextMenuBtn: this.memberListRef.current?.querySelector(`.mx_MemberItem[data-uid="${member.userId}"]`),
        });
    };

    private onCloseSendDMContextMenu = () => {
        this.setState({
            showSendDMContextMenu: false,
            selectedMember: null,
            contextMenuBtn: null,
        });
    };

    private onContextMenu = (member, e) => {
        e.preventDefault();
        e.stopPropagation();

        const client = MatrixClientPeg.get();
        const isMe = member.userId === client.getUserId();
        if (isMe) return;

        const room = client.getRoom(this.props.roomId);
        if (!room.canRemoveUser(client.getUserId())) return;

        this.setState({
            showContextMenu: true,
            selectedMember: member,
            generalMenuPosition: {
                left: e.clientX,
                bottom: e.clientY,
            },
        });
    };

    private onCloseContextMenu = () => {
        this.setState({
            showContextMenu: false,
            selectedMember: null,
            contextMenuBtn: null,
        });
    };

    private onRemoveMember = () => {
        Modal.createDialog(RemoveUserDialog, {
            roomId: this.props.roomId,
            userId: this.state.selectedMember.userId,
        });
    };

    private makeMemberTiles = (members: Array<RoomMember>): JSX.Element[] => {
        return members.map((m) => (
            <div className="mx_MemberItem" data-uid={m.userId} key={m.userId}>
                <MemberTile
                    key={m.userId}
                    member={m}
                    ref={m.userId}
                    showPresence={this.showPresence}
                    onClick={(e) => this.onShowSendDMContextMenu(m, e)}
                    onContextMenu={(e) => this.onContextMenu(m, e)}
                />
            </div>
        ));
    };

    private renderContextMenu() {
        if (!this.state.showContextMenu || !this.state.selectedMember || !this.state.generalMenuPosition) return null;

        return (
            <IconizedContextMenu
                compact
                {...contextMenuBelow(this.state.generalMenuPosition)}
                menuWidth={130}
                onFinished={this.onCloseContextMenu}
            >
                <IconizedContextMenuOptionList first>
                    <IconizedContextMenuOption label={_t("Remove users")} onClick={this.onRemoveMember} />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    private renderSendDMContextMenu() {
        if (!this.state.showSendDMContextMenu || !this.state.contextMenuBtn || !this.state.selectedMember) {
            return null;
        }

        const rect = this.state.contextMenuBtn.getBoundingClientRect();
        if (!rect) return;

        const cli = MatrixClientPeg.get();
        const room = cli.getRoom(this.props.roomId);

        return (
            <SendDMContextMenu
                {...toLeftOf(rect, rect.height / 2)}
                room={room}
                member={this.state.selectedMember}
                onFinished={this.onCloseSendDMContextMenu}
            />
        );
    }

    public render(): React.ReactNode {
        return (
            <>
                <BaseCard className="mx_MemberListPanel" title={"成员列表"} onClose={this.props.onClose}>
                    <div ref={this.memberListRef}>
                        <MemberList roomId={this.props.roomId} makeMemberTiles={this.makeMemberTiles} />
                    </div>
                </BaseCard>
                {this.state.showSendDMContextMenu && this.renderSendDMContextMenu()}
                {this.state.showContextMenu && this.renderContextMenu()}
            </>
        );
    }
}
