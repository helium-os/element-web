/*
Copyright 2021 Robin Townsend <robin@robin.town>

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

import React, { useEffect, useMemo, useState, useRef, ReactNode } from "react";
import classnames from "classnames";
import { IContent, MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { ILocationContent, LocationAssetType, M_TIMESTAMP } from "matrix-js-sdk/src/@types/location";
import { makeLocationContent } from "matrix-js-sdk/src/content-helpers";
import { M_BEACON } from "matrix-js-sdk/src/@types/beacon";

import { _t } from "../../../languageHandler";
import dis from "../../../dispatcher/dispatcher";
import { useSettingValue } from "../../../hooks/useSettings";
import { Layout } from "../../../settings/enums/Layout";
import BaseDialog from "./BaseDialog";
import { avatarUrlForUser } from "../../../Avatar";
import EventTile from "../rooms/EventTile";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { sortRooms } from "../../../stores/room-list/algorithms/tag-sorting/RecentAlgorithm";
import QueryMatcher from "../../../autocomplete/QueryMatcher";
import TruncatedList from "../elements/TruncatedList";
import EntityTile from "../rooms/EntityTile";
import BaseAvatar from "../avatars/BaseAvatar";
import { Action } from "../../../dispatcher/actions";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { ButtonEvent } from "../elements/AccessibleButton";
import { isLocationEvent } from "../../../utils/EventUtils";
import { isSelfLocation, locationEventGeoUri } from "../../../utils/location";
import { RoomContextDetails } from "../rooms/RoomContextDetails";
import { filterBoolean } from "../../../utils/arrays";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field, { SelectedUserOrRoomTile } from "matrix-react-sdk/src/components/views/elements/Field";
import ContextMenu, { ChevronFace } from "matrix-react-sdk/src/components/structures/ContextMenu";
import RoomAndChannelAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAndChannelAvatar";

const AVATAR_SIZE = 30;

interface IProps {
    matrixClient: MatrixClient;
    // The event to forward
    event: MatrixEvent;
    // We need a permalink creator for the source room to pass through to EventTile
    // in case the event is a reply (even though the user can't get at the link)
    permalinkCreator: RoomPermalinkCreator;
    onFinished(): void;
}

interface IEntryProps {
    room: Room;
    className?: string;
    onToggle(room: Room): void;
    onFinished?(success: boolean): void;
}

const Entry: React.FC<IEntryProps> = ({ className, room, onToggle, onFinished }) => {
    const jumpToRoom = (ev: ButtonEvent): void => {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: room.roomId,
            metricsTrigger: "WebForwardShortcut",
            metricsViaKeyboard: ev.type !== "click",
        });
        onFinished(true);
    };

    return (
        <div className={`mx_ForwardList_entry ${className}`} onClick={() => onToggle(room)}>
            <RoomAndChannelAvatar room={room} avatarSize={24} />
            <span className="mx_Field_DropdownMenuItem_title">{room.name}</span>
            <RoomContextDetails component="span" className="mx_Field_DropdownMenuItem_description" room={room} />
        </div>
    );
};

const transformEvent = (event: MatrixEvent): { type: string; content: IContent } => {
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        "m.relates_to": _, // strip relations - in future we will attach a relation pointing at the original event
        // We're taking a shallow copy here to avoid https://github.com/vector-im/element-web/issues/10924
        ...content
    } = event.getContent();

    // beacon pulses get transformed into static locations on forward
    const type = M_BEACON.matches(event.getType()) ? EventType.RoomMessage : event.getType();

    // self location shares should have their description removed
    // and become 'pin' share type
    if (
        (isLocationEvent(event) && isSelfLocation(content as ILocationContent)) ||
        // beacon pulses get transformed into static locations on forward
        M_BEACON.matches(event.getType())
    ) {
        const timestamp = M_TIMESTAMP.findIn<number>(content);
        const geoUri = locationEventGeoUri(event);
        return {
            type,
            content: {
                ...content,
                ...makeLocationContent(
                    undefined, // text
                    geoUri,
                    timestamp || Date.now(),
                    undefined, // description
                    LocationAssetType.Pin,
                ),
            },
        };
    }

    return { type, content };
};

const ForwardDialog: React.FC<IProps> = ({ matrixClient: cli, event, permalinkCreator, onFinished }) => {
    const userId = cli.getSafeUserId();
    const [profileInfo, setProfileInfo] = useState<any>({});
    useEffect(() => {
        cli.getProfileInfo(userId).then((info) => setProfileInfo(info));
    }, [cli, userId]);

    const { type, content } = transformEvent(event);

    // For the message preview we fake the sender as ourselves
    const mockEvent = new MatrixEvent({
        type: "m.room.message",
        sender: userId,
        content,
        unsigned: {
            age: 97,
        },
        event_id: "$9999999999999999999999999999999999999999999",
        room_id: event.getRoomId(),
    });
    mockEvent.sender = {
        name: profileInfo.displayname || userId,
        rawDisplayName: profileInfo.displayname,
        userId,
        getAvatarUrl: (..._) => {
            return avatarUrlForUser({ avatarUrl: profileInfo.avatar_url }, AVATAR_SIZE, AVATAR_SIZE, "crop");
        },
        getMxcAvatarUrl: () => profileInfo.avatar_url,
    } as RoomMember;

    const [query, setQuery] = useState("");
    const lcQuery = query.toLowerCase();

    const previewLayout = useSettingValue<Layout>("layout");
    const msc3946DynamicRoomPredecessors = useSettingValue<boolean>("feature_dynamic_room_predecessors");

    const searchRef = useRef(null);
    const limitForward = 3;
    const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
    const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
    const [busy, setBusy] = useState<boolean>(false);

    let rooms = useMemo(
        () =>
            sortRooms(
                cli
                    .getVisibleRooms(msc3946DynamicRoomPredecessors)
                    .filter((room) => room.getMyMembership() === "join" && !room.isSpaceRoom() && !room.isAdminLeft()), // 过滤掉管理员离开的房间（群聊里，管理员离开后，其他成员不能再发送消息；私聊里，一方离开后，另外一方也不能再发消息）
            ),
        [cli, msc3946DynamicRoomPredecessors],
    );

    if (lcQuery) {
        rooms = new QueryMatcher<Room>(rooms, {
            keys: ["name"],
            funcs: [(r) => filterBoolean([r.getCanonicalAlias(), ...r.getAltAliases()])],
            shouldMatchWordsOnly: false,
        }).match(lcQuery);
    }

    const [truncateAt, setTruncateAt] = useState(20);
    function overflowTile(overflowCount: number, totalCount: number): JSX.Element {
        const text = _t("and %(count)s others...", { count: overflowCount });
        return (
            <EntityTile
                className="mx_EntityTile_ellipsis"
                avatarJsx={
                    <BaseAvatar
                        url={require("../../../../res/img/ellipsis.svg").default}
                        name="..."
                        width={36}
                        height={36}
                    />
                }
                name={text}
                presenceState="online"
                suppressOnHover={true}
                onClick={() => setTruncateAt(totalCount)}
            />
        );
    }

    const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setQuery(value);
        setShowContextMenu(!!value.trim());
    };

    const onToggle = (room: Room) => {
        const newSelectedRooms = [...selectedRooms];
        const index = newSelectedRooms.findIndex((item) => item.roomId === room.roomId);
        if (index !== -1) {
            newSelectedRooms.splice(index, 1);
        } else {
            newSelectedRooms.push(room);
        }
        setQuery("");
        setSelectedRooms(newSelectedRooms);
        setShowContextMenu(false);
    };

    const onSend = async (): Promise<void> => {
        if (busy) return;

        setBusy(true);
        try {
            await Promise.all(selectedRooms.map((room) => cli.sendEvent(room.roomId, type, content)));
            onFinished();
        } catch (e) {
        } finally {
            setBusy(false);
        }
    };

    const renderMenu = (): ReactNode => {
        if (!searchRef.current || !showContextMenu) return null;

        const { width, bottom, left } = searchRef.current.getBoundingClientRect();

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
                        {rooms.length > 0 ? (
                            <TruncatedList
                                className="mx_Field_DropdownMenuList"
                                truncateAt={truncateAt}
                                createOverflowElement={overflowTile}
                                getChildren={(start, end) =>
                                    rooms.slice(start, end).map(
                                        (
                                            room, // TODO room.maySendMessage()
                                        ) => (
                                            <Entry
                                                key={room.roomId}
                                                room={room}
                                                className="mx_Field_DropdownMenuItem"
                                                onToggle={onToggle}
                                                onFinished={onFinished}
                                            />
                                        ),
                                    )
                                }
                                getChildCount={() => rooms.length}
                            />
                        ) : (
                            <span className="mx_Field_DropdownMenu_noResults">{_t("No results")}</span>
                        )}
                    </div>
                </div>
            </ContextMenu>
        );
    };

    let prefixComponent;
    if (selectedRooms.length > 0) {
        prefixComponent = selectedRooms.map((room) => (
            <SelectedUserOrRoomTile
                key={room.roomId}
                avatar={<RoomAndChannelAvatar room={room} avatarSize={20} />}
                name={room.name}
                onRemove={() => onToggle(room)}
            />
        ));
    }

    const footer = <DialogButtons primaryButton={_t("Send")} onPrimaryButtonClick={onSend} onCancel={onFinished} />;

    return (
        <BaseDialog
            title={_t("Forward message")}
            className="mx_ForwardDialog"
            onFinished={onFinished}
            fixedWidth={false}
            footer={footer}
        >
            <div ref={searchRef}>
                <Field
                    type="text"
                    usePlaceholderAsHint={!prefixComponent}
                    placeholder={"请输入频道或用户名"}
                    label={"频道或用户名"}
                    className={limitForward && selectedRooms.length >= limitForward ? "mx_Field_hideInput" : ""}
                    autoFocus={false}
                    autoComplete="off"
                    prefixComponent={prefixComponent}
                    hasPrefixContainer={false}
                    clearEnable={false}
                    value={query}
                    onChange={onQueryChange}
                />
            </div>
            {renderMenu()}

            <div className="mx_ForwardMsg_preview_wrap">
                <div className="mx_ForwardMsg_preview_inner">
                    <p className="mx_ForwardMsg_preview_title">{_t("Message preview")}</p>
                    <div
                        className={classnames("mx_ForwardDialog_preview_box", {
                            mx_IRCLayout: previewLayout == Layout.IRC,
                        })}
                    >
                        <div className="mx_ForwardDialog_preview">
                            <EventTile
                                mxEvent={mockEvent}
                                layout={previewLayout}
                                alwaysShowTimestamps={true}
                                permalinkCreator={permalinkCreator}
                                as="div"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </BaseDialog>
    );
};

export default ForwardDialog;
