/*
Copyright 2015-2018, 2020, 2021 The Matrix.org Foundation C.I.C.

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
import React, { ComponentType, createRef, ReactComponentElement, RefObject, SyntheticEvent, useContext } from "react";

import { DragDropContext, Droppable } from "react-beautiful-dnd";
import type { DropResult } from "react-beautiful-dnd";

import { IState as IRovingTabIndexState, RovingTabIndexProvider } from "../../../accessibility/RovingTabIndex";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { Action } from "../../../dispatcher/actions";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { ActionPayload } from "../../../dispatcher/payloads";
import { ViewRoomDeltaPayload } from "../../../dispatcher/payloads/ViewRoomDeltaPayload";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import PosthogTrackers from "../../../PosthogTrackers";
import SettingsStore from "../../../settings/SettingsStore";
import { UIComponent } from "../../../settings/UIFeature";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import { ITagMap } from "../../../stores/room-list/algorithms/models";
import { DefaultTagID, DragType, OrderedDefaultTagIDs, TagID, Tag } from "../../../stores/room-list/models";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../../stores/room-list/RoomListStore";
import {
    isMetaSpace,
    ISuggestedRoom,
    MetaSpace,
    SpaceKey,
    UPDATE_SELECTED_SPACE,
    UPDATE_SPACE_TAGS,
    UPDATE_SUGGESTED_ROOMS,
} from "../../../stores/spaces";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { arrayFastClone, arrayHasDiff } from "../../../utils/arrays";
import { objectShallowClone, objectWithOnly } from "../../../utils/objects";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import { shouldShowSpaceInvite, showSpaceInvite } from "../../../utils/space";
import { ChevronFace, ContextMenuTooltipButton, MenuProps, useContextMenu } from "../../structures/ContextMenu";
import RoomAvatar from "../avatars/RoomAvatar";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import ExtraTile from "./ExtraTile";
import RoomSublist, { IAuxButtonProps } from "./RoomSublist";
import { SdkContextClass } from "../../../contexts/SDKContext";
import SpaceAddChanelContextMenu, {
    onCreateRoom,
} from "matrix-react-sdk/src/components/views/context_menus/SpaceAddChannelContextMenu";
import SpaceChannelAvatar from "matrix-react-sdk/src/components/views/avatars/SpaceChannelAvatar";
import { isPrivateRoom } from "../../../../../vector/rewrite-js-sdk/room";
import { EventType } from "matrix-js-sdk/src/@types/event";

interface IProps {
    onKeyDown: (ev: React.KeyboardEvent, state: IRovingTabIndexState) => void;
    onFocus: (ev: React.FocusEvent) => void;
    onBlur: (ev: React.FocusEvent) => void;
    onResize: () => void;
    onListCollapse?: (isExpanded: boolean) => void;
    resizeNotifier: ResizeNotifier;
    isMinimized: boolean;
    activeSpace: SpaceKey;
}

interface IState {
    sublists: ITagMap;
    currentRoomId?: string;
    suggestedRooms: ISuggestedRoom[];
    feature_favourite_messages: boolean;
    spaceTags: Tag[];
    userTagIds: TagID[];
    spaceTagIds: TagID[];
    tagAesthetics: TagAestheticsMap;
    alwaysVisibleTags: TagID[];
}

const ALWAYS_VISIBLE_TAGS: TagID[] = [DefaultTagID.DM, DefaultTagID.Untagged];

interface ITagAesthetics {
    sectionLabel: string;
    sectionLabelRaw?: string;
    AuxButtonComponent?: ComponentType<IAuxButtonProps>;
    isInvite: boolean;
    defaultHidden: boolean;
}

type TagAestheticsMap = Partial<{
    [tagId in TagID]: ITagAesthetics;
}>;

const auxButtonContextMenuPosition = (handle: RefObject<HTMLDivElement>): MenuProps => {
    const rect = handle.current.getBoundingClientRect();
    return {
        chevronFace: ChevronFace.None,
        left: rect.left - 7,
        top: rect.top + rect.height,
    };
};

const DmAuxButton: React.FC<IAuxButtonProps> = ({ tabIndex, dispatcher = defaultDispatcher }) => {
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();
    const activeSpace = useEventEmitterState(SpaceStore.instance, UPDATE_SELECTED_SPACE, () => {
        return SpaceStore.instance.activeSpaceRoom;
    });

    const showCreateRooms = shouldShowComponent(UIComponent.CreateRooms);
    const showInviteUsers = shouldShowComponent(UIComponent.InviteUsers);

    if (activeSpace && (showCreateRooms || showInviteUsers)) {
        let contextMenu: JSX.Element | undefined;
        if (menuDisplayed) {
            const canInvite = shouldShowSpaceInvite(activeSpace);

            contextMenu = (
                <IconizedContextMenu {...auxButtonContextMenuPosition(handle)} onFinished={closeMenu} compact>
                    <IconizedContextMenuOptionList first>
                        {showCreateRooms && (
                            <IconizedContextMenuOption
                                label={_t("Start new chat")}
                                iconClassName="mx_RoomList_iconStartChat"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeMenu();
                                    defaultDispatcher.dispatch({ action: "view_create_chat" });
                                    PosthogTrackers.trackInteraction(
                                        "WebRoomListRoomsSublistPlusMenuCreateChatItem",
                                        e,
                                    );
                                }}
                            />
                        )}
                        {showInviteUsers && (
                            <IconizedContextMenuOption
                                label={_t("Invite to space")}
                                iconClassName="mx_RoomList_iconInvite"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeMenu();
                                    showSpaceInvite(activeSpace);
                                }}
                                disabled={!canInvite}
                                tooltip={
                                    canInvite
                                        ? undefined
                                        : _t("You do not have permissions to invite people to this space")
                                }
                            />
                        )}
                    </IconizedContextMenuOptionList>
                </IconizedContextMenu>
            );
        }

        return (
            <>
                <ContextMenuTooltipButton
                    tabIndex={tabIndex}
                    onClick={openMenu}
                    className="mx_RoomSublist_auxButton"
                    tooltipClassName="mx_RoomSublist_addRoomTooltip"
                    aria-label={_t("Add people")}
                    title={_t("Add people")}
                    isExpanded={menuDisplayed}
                    inputRef={handle}
                />

                {contextMenu}
            </>
        );
    } else if (!activeSpace && showCreateRooms) {
        return (
            <AccessibleTooltipButton
                tabIndex={tabIndex}
                onClick={(e) => {
                    dispatcher.dispatch({ action: "view_create_chat" });
                    PosthogTrackers.trackInteraction("WebRoomListRoomsSublistPlusMenuCreateChatItem", e);
                }}
                className="mx_RoomSublist_auxButton"
                tooltipClassName="mx_RoomSublist_addRoomTooltip"
                aria-label={_t("Start chat")}
                title={_t("Start chat")}
            />
        );
    }

    return null;
};

const UntaggedAuxButton: React.FC<IAuxButtonProps> = ({ tabIndex, tagId }) => {
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();
    const activeSpace = useEventEmitterState<Room | null>(SpaceStore.instance, UPDATE_SELECTED_SPACE, () => {
        return SpaceStore.instance.activeSpaceRoom;
    });

    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;
    const hasPermissionToAddSpaceChild = activeSpace?.currentState.maySendStateEvent(EventType.SpaceChild, userId);
    const canAddRooms =
        activeSpace?.getMyMembership() === "join" &&
        hasPermissionToAddSpaceChild &&
        shouldShowComponent(UIComponent.CreateRooms);
    const showCreateRoom = activeSpace ? canAddRooms : shouldShowComponent(UIComponent.CreateRooms);

    const showExploreRooms = false && shouldShowComponent(UIComponent.ExploreRooms);

    const createRoomLabel = _t("Create room", { roomType: _t(activeSpace ? "channel" : "room") });

    let tags;
    if (tagId) tags = [{ tagId }];

    let contextMenuContent: JSX.Element | undefined;
    if (menuDisplayed && activeSpace) {
        contextMenuContent = (
            <IconizedContextMenuOptionList first>
                <IconizedContextMenuOption
                    label={_t("Explore rooms")}
                    iconClassName="mx_RoomList_iconExplore"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeMenu();
                        defaultDispatcher.dispatch<ViewRoomPayload>({
                            action: Action.ViewRoom,
                            room_id: activeSpace.roomId,
                            metricsTrigger: undefined, // other
                        });
                        PosthogTrackers.trackInteraction("WebRoomListRoomsSublistPlusMenuExploreRoomsItem", e);
                    }}
                />
                {showCreateRoom ? <SpaceAddChanelContextMenu tagId={tagId} onFinished={closeMenu} /> : null}
            </IconizedContextMenuOptionList>
        );
    } else if (menuDisplayed) {
        contextMenuContent = (
            <IconizedContextMenuOptionList first>
                {showCreateRoom && <SpaceAddChanelContextMenu tagId={tagId} onFinished={closeMenu} />}
                {showExploreRooms ? (
                    <IconizedContextMenuOption
                        label={_t("Explore public rooms")}
                        iconClassName="mx_RoomList_iconExplore"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeMenu();
                            PosthogTrackers.trackInteraction("WebRoomListRoomsSublistPlusMenuExploreRoomsItem", e);
                            defaultDispatcher.fire(Action.ViewRoomDirectory);
                        }}
                    />
                ) : null}
            </IconizedContextMenuOptionList>
        );
    }

    let contextMenu: JSX.Element | null = null;
    if (menuDisplayed) {
        contextMenu = (
            <IconizedContextMenu {...auxButtonContextMenuPosition(handle)} onFinished={closeMenu} compact>
                {contextMenuContent}
            </IconizedContextMenu>
        );
    }

    if (showCreateRoom && showExploreRooms) {
        return (
            <>
                <ContextMenuTooltipButton
                    tabIndex={tabIndex}
                    onClick={openMenu}
                    className="mx_RoomSublist_auxButton"
                    tooltipClassName="mx_RoomSublist_addRoomTooltip"
                    aria-label={_t("Add room")}
                    title={_t("Add room")}
                    isExpanded={menuDisplayed}
                    inputRef={handle}
                />

                {contextMenu}
            </>
        );
    } else if (showCreateRoom) {
        return (
            <AccessibleTooltipButton
                tabIndex={tabIndex}
                onClick={() => onCreateRoom(activeSpace, undefined, tags)}
                className="mx_RoomSublist_auxButton"
                tooltipClassName="mx_RoomSublist_addRoomTooltip"
                aria-label={createRoomLabel}
                title={createRoomLabel}
            />
        );
    }

    return null;
};

function generateTagAesthetics(isHomeSpace): TagAestheticsMap {
    return {
        [DefaultTagID.Invite]: {
            sectionLabel: _t("Invites"),
            isInvite: true,
            defaultHidden: false,
        },
        [DefaultTagID.Favourite]: {
            sectionLabel: _t("Favourites"),
            isInvite: false,
            defaultHidden: false,
        },
        [DefaultTagID.SavedItems]: {
            sectionLabel: _t("Saved Items"),
            isInvite: false,
            defaultHidden: false,
        },
        [DefaultTagID.DM]: {
            sectionLabel: _t("People"),
            isInvite: false,
            defaultHidden: false,
            AuxButtonComponent: DmAuxButton,
        },
        [DefaultTagID.Untagged]: {
            sectionLabel: _t(isHomeSpace ? "Rooms" : "Channel"),
            isInvite: false,
            defaultHidden: false,
            AuxButtonComponent: UntaggedAuxButton,
        },
        [DefaultTagID.LowPriority]: {
            sectionLabel: _t("Low priority"),
            isInvite: false,
            defaultHidden: false,
        },
        [DefaultTagID.ServerNotice]: {
            sectionLabel: _t("System Alerts"),
            isInvite: false,
            defaultHidden: false,
        },

        // TODO: Replace with archived view: https://github.com/vector-im/element-web/issues/14038
        [DefaultTagID.Archived]: {
            sectionLabel: _t("Historical"),
            isInvite: false,
            defaultHidden: true,
        },

        [DefaultTagID.Suggested]: {
            sectionLabel: _t("Suggested Rooms"),
            isInvite: false,
            defaultHidden: false,
        },
    };
}

export default class RoomList extends React.PureComponent<IProps, IState> {
    private dispatcherRef?: string;
    private treeRef = createRef<HTMLDivElement>();
    private favouriteMessageWatcher: string;

    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            sublists: {},
            suggestedRooms: SpaceStore.instance.suggestedRooms,
            feature_favourite_messages: SettingsStore.getValue("feature_favourite_messages"),
            spaceTags: [],
            spaceTagIds: [],
            userTagIds: [],
            alwaysVisibleTags: [],
            tagAesthetics: {},
        };
    }

    public componentDidMount(): void {
        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        SdkContextClass.instance.roomViewStore.on(UPDATE_EVENT, this.onRoomViewStoreUpdate);
        SpaceStore.instance.on(UPDATE_SUGGESTED_ROOMS, this.updateSuggestedRooms);
        RoomListStore.instance.on(LISTS_UPDATE_EVENT, this.updateLists);
        this.favouriteMessageWatcher = SettingsStore.watchSetting(
            "feature_favourite_messages",
            null,
            (...[, , , value]) => {
                this.setState({ feature_favourite_messages: value });
            },
        );
        this.updateLists(); // trigger the first update

        SdkContextClass.instance.spaceStore.on(UPDATE_SELECTED_SPACE, this.onActiveSpaceUpdate);
        SdkContextClass.instance.spaceStore.on(UPDATE_SPACE_TAGS, this.onSpaceTagsUpdate);
        this.refreshSpaceTagsRelatedInfo();
    }

    public componentDidUpdate(prevProps, prevState): void {
        if (this.state.spaceTags !== prevState.spaceTags) {
            this.refreshSpaceTagsRelatedInfo();
        }
    }

    public componentWillUnmount(): void {
        SpaceStore.instance.off(UPDATE_SUGGESTED_ROOMS, this.updateSuggestedRooms);
        RoomListStore.instance.off(LISTS_UPDATE_EVENT, this.updateLists);
        SettingsStore.unwatchSetting(this.favouriteMessageWatcher);
        if (this.dispatcherRef) defaultDispatcher.unregister(this.dispatcherRef);
        SdkContextClass.instance.roomViewStore.off(UPDATE_EVENT, this.onRoomViewStoreUpdate);

        SdkContextClass.instance.spaceStore.off(UPDATE_SELECTED_SPACE, this.onActiveSpaceUpdate);
        SdkContextClass.instance.spaceStore.off(UPDATE_SPACE_TAGS, this.onSpaceTagsUpdate);
    }

    private onActiveSpaceUpdate = () => {
        const orderedTagIds = new Set([
            ...(!SpaceStore.instance.isHomeSpace ? [DefaultTagID.Untagged] : []),
            ...OrderedDefaultTagIDs,
        ]);
        this.setState({
            userTagIds: [...orderedTagIds].filter((item) => item !== DefaultTagID.Archived),
        });
    };

    private onSpaceTagsUpdate = (spaceTags) => {
        this.setState({
            spaceTags,
        });
    };

    // 更新和spaceTags相关的信息
    private refreshSpaceTagsRelatedInfo = (spaceTags = this.state.spaceTags) => {
        const spaceTagAesthetics = {};
        for (const item of spaceTags) {
            spaceTagAesthetics[item.tagId] = {
                sectionLabel: item.tagName,
                isInvite: false,
                defaultHidden: false,
                AuxButtonComponent: UntaggedAuxButton,
            };
        }

        const spaceTagIds: TagID[] = spaceTags.map((item) => item.tagId);

        this.setState({
            tagAesthetics: {
                ...generateTagAesthetics(SpaceStore.instance.isHomeSpace),
                ...spaceTagAesthetics,
            },
            spaceTagIds,
            alwaysVisibleTags: [...ALWAYS_VISIBLE_TAGS, ...spaceTagIds],
        });
    };

    private onRoomViewStoreUpdate = (): void => {
        this.setState({
            currentRoomId: SdkContextClass.instance.roomViewStore.getRoomId() ?? undefined,
        });
    };

    private onAction = (payload: ActionPayload): void => {
        if (payload.action === Action.ViewRoomDelta) {
            const viewRoomDeltaPayload = payload as ViewRoomDeltaPayload;
            const currentRoomId = SdkContextClass.instance.roomViewStore.getRoomId();
            const room = this.getRoomDelta(currentRoomId, viewRoomDeltaPayload.delta, viewRoomDeltaPayload.unread);
            if (room) {
                defaultDispatcher.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    show_room_tile: true, // to make sure the room gets scrolled into view
                    metricsTrigger: "WebKeyboardShortcut",
                    metricsViaKeyboard: true,
                });
            }
        } else if (payload.action === Action.PstnSupportUpdated) {
            this.updateLists();
        }
    };

    private getRoomDelta = (roomId: string, delta: number, unread = false): Room => {
        const lists = RoomListStore.instance.orderedLists;
        const rooms: Room[] = [];
        [...this.state.userTagIds, ...this.state.spaceTagIds].forEach((t) => {
            let listRooms = lists[t];

            if (unread) {
                // filter to only notification rooms (and our current active room so we can index properly)
                listRooms = listRooms.filter((r) => {
                    const state = RoomNotificationStateStore.instance.getRoomState(r);
                    return state.room.roomId === roomId || state.isUnread;
                });
            }

            rooms.push(...listRooms);
        });

        const currentIndex = rooms.findIndex((r) => r.roomId === roomId);
        // use slice to account for looping around the start
        const [room] = rooms.slice((currentIndex + delta) % rooms.length);
        return room;
    };

    private updateSuggestedRooms = (suggestedRooms: ISuggestedRoom[]): void => {
        this.setState({ suggestedRooms });
    };

    private updateLists = (): void => {
        const newLists = RoomListStore.instance.orderedLists;
        const previousListIds = Object.keys(this.state.sublists);
        const newListIds = Object.keys(newLists);

        let doUpdate = arrayHasDiff(previousListIds, newListIds);
        if (!doUpdate) {
            // so we didn't have the visible sublists change, but did the contents of those
            // sublists change significantly enough to break the sticky headers? Probably, so
            // let's check the length of each.
            for (const tagId of newListIds) {
                const oldRooms = this.state.sublists[tagId];
                const newRooms = newLists[tagId];
                if (oldRooms.length !== newRooms.length) {
                    doUpdate = true;
                    break;
                }
            }
        }

        if (doUpdate) {
            // We have to break our reference to the room list store if we want to be able to
            // diff the object for changes, so do that.
            // @ts-ignore - ITagMap is ts-ignored so this will have to be too
            const newSublists = objectWithOnly(newLists, newListIds);
            const sublists = objectShallowClone(newSublists, (k, v) => arrayFastClone(v));

            this.setState({ sublists }, () => {
                this.props.onResize();
            });
        }
    };

    private renderSuggestedRooms(): ReactComponentElement<typeof ExtraTile>[] {
        return this.state.suggestedRooms.map((room) => {
            const name = room.name || room.canonical_alias || room.aliases?.[0] || _t("Empty room");
            const isPrivate = isPrivateRoom(room.join_rule);
            const avatar = <SpaceChannelAvatar isPrivate={isPrivate} />;
            const viewRoom = (ev: SyntheticEvent): void => {
                defaultDispatcher.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_alias: room.canonical_alias || room.aliases?.[0],
                    room_id: room.room_id,
                    via_servers: room.viaServers,
                    oob_data: {
                        avatarUrl: room.avatar_url,
                        name,
                    },
                    metricsTrigger: "RoomList",
                    metricsViaKeyboard: ev.type !== "click",
                });
            };
            return (
                <ExtraTile
                    isMinimized={this.props.isMinimized}
                    isSelected={this.state.currentRoomId === room.room_id}
                    displayName={name}
                    avatar={avatar}
                    onClick={viewRoom}
                    key={`suggestedRoomTile_${room.room_id}`}
                />
            );
        });
    }
    private renderFavoriteMessagesList(): ReactComponentElement<typeof ExtraTile>[] {
        const avatar = (
            <RoomAvatar
                oobData={{
                    name: "Favourites",
                }}
                width={32}
                height={32}
                resizeMethod="crop"
            />
        );

        return [
            <ExtraTile
                isMinimized={this.props.isMinimized}
                isSelected={false}
                displayName="Favourite Messages"
                avatar={avatar}
                onClick={() => ""}
                key="favMessagesTile_key"
            />,
        ];
    }

    private renderSublists(): React.ReactElement[] {
        // show a skeleton UI if the user is in no rooms and they are not filtering and have no suggested rooms
        const showSkeleton =
            false &&
            !this.state.suggestedRooms?.length &&
            Object.values(RoomListStore.instance.orderedLists).every((list) => !list?.length);

        return [...this.state.userTagIds, ...this.state.spaceTagIds].map((orderedTagId, index) => {
            let extraTiles: ReactComponentElement<typeof ExtraTile>[] | undefined;
            if (orderedTagId === DefaultTagID.Suggested) {
                extraTiles = this.renderSuggestedRooms();
            } else if (this.state.feature_favourite_messages && orderedTagId === DefaultTagID.SavedItems) {
                extraTiles = this.renderFavoriteMessagesList();
            }

            const aesthetics = this.state.tagAesthetics[orderedTagId];
            if (!aesthetics) return;
            if (!aesthetics) throw new Error(`Tag ${orderedTagId} does not have aesthetics`);

            let alwaysVisible = this.state.alwaysVisibleTags.includes(orderedTagId);
            if (
                (this.props.activeSpace === MetaSpace.Favourites && orderedTagId !== DefaultTagID.Favourite) ||
                (this.props.activeSpace === MetaSpace.People && orderedTagId !== DefaultTagID.DM) ||
                (this.props.activeSpace === MetaSpace.Orphans && orderedTagId === DefaultTagID.DM) ||
                (!isMetaSpace(this.props.activeSpace) &&
                    orderedTagId === DefaultTagID.DM &&
                    !SettingsStore.getValue("Spaces.showPeopleInSpace", this.props.activeSpace))
            ) {
                alwaysVisible = false;
            }

            let forceExpanded = true; // 默认都展开
            if (
                (this.props.activeSpace === MetaSpace.Favourites && orderedTagId === DefaultTagID.Favourite) ||
                (this.props.activeSpace === MetaSpace.People && orderedTagId === DefaultTagID.DM)
            ) {
                forceExpanded = true;
            }
            // The cost of mounting/unmounting this component offsets the cost
            // of keeping it in the DOM and hiding it when it is not required
            return (
                <RoomSublist
                    key={`sublist-${orderedTagId}`}
                    index={this.state.spaceTagIds.indexOf(orderedTagId)}
                    tagId={orderedTagId}
                    forRooms={true}
                    startAsHidden={aesthetics.defaultHidden}
                    label={aesthetics.sectionLabelRaw || aesthetics.sectionLabel}
                    AuxButtonComponent={aesthetics.AuxButtonComponent}
                    isMinimized={this.props.isMinimized}
                    showSkeleton={showSkeleton}
                    extraTiles={extraTiles}
                    resizeNotifier={this.props.resizeNotifier}
                    alwaysVisible={alwaysVisible}
                    onListCollapse={this.props.onListCollapse}
                    forceExpanded={forceExpanded}
                />
            );
        });
    }

    public focus(): void {
        // focus the first focusable element in this aria treeview widget
        const treeItems = this.treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]');
        if (!treeItems) return;
        [...treeItems].find((e) => e.offsetParent !== null)?.focus();
    }

    private async onDragEnd(result: DropResult): Promise<void> {
        console.log("拖拽结束", result);
        if (!result.destination) return;

        const { droppableId } = result.destination;

        // 拖拽修改频道所属分组
        if (result.type === DragType.Channel) {
            const roomId = result.draggableId;
            const tagId = droppableId;
            try {
                await MatrixClientPeg.get().setRoomOnlyTags(roomId, tagId === DefaultTagID.Untagged ? [] : [{ tagId }]);
            } catch (error) {
                alert(error.message);
            }
            return;
        }

        // 拖拽修改社区分组顺序
        const { index: targetIndex } = result.destination;
        if (targetIndex === -1) return; // 为-1时，表示拖拽到了默认分组之前，不做任何处理

        const { index: originalIndex } = result.source;
        if (targetIndex === originalIndex) return;

        const tags = Array.from(SpaceStore.instance.spaceTags);
        const [removed] = tags.splice(originalIndex, 1);
        tags.splice(targetIndex, 0, removed);
        try {
            await SpaceStore.instance.sendSpaceTags(tags);
        } catch (error) {
            alert(error.message);
        }
    }

    public render(): React.ReactNode {
        const sublists = this.renderSublists();
        return (
            <RovingTabIndexProvider handleHomeEnd handleUpDown onKeyDown={this.props.onKeyDown}>
                {({ onKeyDownHandler }) => (
                    <DragDropContext onDragEnd={this.onDragEnd}>
                        <Droppable droppableId="spaceTag-droppable" type={DragType.SpaceTag}>
                            {(droppableProvided, droppableSnapshot) => (
                                <div ref={droppableProvided.innerRef}>
                                    <div
                                        onFocus={this.props.onFocus}
                                        onBlur={this.props.onBlur}
                                        onKeyDown={onKeyDownHandler}
                                        className="mx_RoomList"
                                        role="tree"
                                        aria-label={_t("Rooms")}
                                        ref={this.treeRef}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        {sublists}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </RovingTabIndexProvider>
        );
    }
}
