/*
Copyright 2021 - 2023 The Matrix.org Foundation C.I.C.

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

import React, { KeyboardEvent, ReactNode, useCallback, useContext, useEffect, useState, useMemo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomHierarchy } from "matrix-js-sdk/src/room-hierarchy";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { IHierarchyRoom } from "matrix-js-sdk/src/@types/spaces";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { GuestAccess, HistoryVisibility } from "matrix-js-sdk/src/@types/partials";

import defaultDispatcher from "../../dispatcher/dispatcher";
import { _t } from "../../languageHandler";
import SearchBox from "./SearchBox";
import SpaceStore from "../../stores/spaces/SpaceStore";
import { useDispatcher } from "../../hooks/useDispatcher";
import { Action } from "../../dispatcher/actions";
import { IState, RovingTabIndexProvider } from "../../accessibility/RovingTabIndex";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { KeyBindingAction } from "../../accessibility/KeyboardShortcuts";
import { getKeyBindingsManager } from "../../KeyBindingsManager";
import { getDisplayAliasForAliasSet } from "../../Rooms";
import SettingsStore from "../../settings/SettingsStore";
import { ISuggestedRoom, UPDATE_FILTERED_SUGGESTED_ROOMS, UPDATE_SPACE_TAGS } from "matrix-react-sdk/src/stores/spaces";
import { DefaultTagID } from "matrix-react-sdk/src/stores/room-list/models";
import SpaceChannelAvatar from "matrix-react-sdk/src/components/views/avatars/SpaceChannelAvatar";
import { isPrivateRoom } from "../../../../vector/rewrite-js-sdk/room";
import RoomListStore, { LISTS_UPDATE_EVENT } from "matrix-react-sdk/src/stores/room-list/RoomListStore";

interface IProps {
    space: Room;
    initialText?: string;
    additionalButtons?: ReactNode;
    showRoom(cli: MatrixClient, room: IHierarchyRoom | Room): void;
}

// 预览已加入的频道
export const showJoinedRoom = (room: Room, clearSearch, metricsTrigger, metricsViaKeyboard = false) => {
    defaultDispatcher.dispatch<ViewRoomPayload>({
        action: Action.ViewRoom,
        show_room_tile: true, // make sure the room is visible in the list
        room_id: room.roomId,
        clear_search: clearSearch,
        metricsTrigger,
        metricsViaKeyboard,
    });
};

// 预览建议的频道（未加入的频道）
export const showSuggestedRoom = (room: IHierarchyRoom, metricsTrigger, metricsViaKeyboard = false) => {
    const roomAlias = getDisplayAliasForAliasSet(room?.canonical_alias ?? "", room?.aliases ?? []) || undefined;

    defaultDispatcher.dispatch<ViewRoomPayload>({
        action: Action.ViewRoom,
        should_peek: true,
        room_alias: roomAlias,
        room_id: room.room_id,
        via_servers: room.viaServers || [],
        oob_data: {
            avatarUrl: room.avatar_url,
            name: room.name || roomAlias || _t("Unnamed room"),
            roomType: room?.room_type,
        },
        metricsTrigger,
        metricsViaKeyboard,
    });
};

export const showRoom = (cli: MatrixClient, room: Room | IHierarchyRoom): void => {
    if (cli.getRoom((room as Room).roomId || (room as IHierarchyRoom).room_id)?.getMyMembership() !== "join") {
        showSuggestedRoom(room as IHierarchyRoom, "RoomDirectory");
        return;
    }

    showJoinedRoom(room as Room, false, "RoomDirectory");
};

interface IHierarchyLevelProps {
    space: Room;
    query?: string;
    onViewRoomClick(room: Room | IHierarchyRoom): void;
}

export const toLocalRoom = (cli: MatrixClient, room: IHierarchyRoom, hierarchy: RoomHierarchy): IHierarchyRoom => {
    const history = cli.getRoomUpgradeHistory(
        room.room_id,
        true,
        SettingsStore.getValue("feature_dynamic_room_predecessors"),
    );

    // Pick latest room that is actually part of the hierarchy
    let cliRoom: Room | null = null;
    for (let idx = history.length - 1; idx >= 0; --idx) {
        if (hierarchy.roomMap.get(history[idx].roomId)) {
            cliRoom = history[idx];
            break;
        }
    }

    if (cliRoom) {
        return {
            ...room,
            room_id: cliRoom.roomId,
            room_type: cliRoom.getType(),
            name: cliRoom.name,
            topic: cliRoom.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent().topic,
            avatar_url: cliRoom.getMxcAvatarUrl() ?? undefined,
            canonical_alias: cliRoom.getCanonicalAlias() ?? undefined,
            aliases: cliRoom.getAltAliases(),
            world_readable:
                cliRoom.currentState.getStateEvents(EventType.RoomHistoryVisibility, "")?.getContent()
                    .history_visibility === HistoryVisibility.WorldReadable,
            guest_can_join:
                cliRoom.currentState.getStateEvents(EventType.RoomGuestAccess, "")?.getContent().guest_access ===
                GuestAccess.CanJoin,
            num_joined_members: cliRoom.getJoinedMemberCount(),
        };
    }

    return room;
};

export const HierarchyLevel: React.FC<IHierarchyLevelProps> = ({ space, query = "", onViewRoomClick }) => {
    const canHiddenGroups = useMemo(() => [DefaultTagID.Suggested, DefaultTagID.Untagged], []); // 没有结果时可以被隐藏的分组

    const [orderedLists, setOrderedLists] = useState(RoomListStore.instance.orderedLists);

    const [spaceTags, setSpaceTags] = useState(SpaceStore.instance.spaceTags);

    // 过滤后的建议的频道（未加入的频道）
    const [suggestedRooms, setSuggestedRooms] = useState<ISuggestedRoom[]>(
        () => SpaceStore.instance.filteredSuggestedRooms,
    );

    const [hierarchyList, setHierarchyList] = useState([]);

    const [isSearch, setIsSearch] = useState<boolean>(false); // 是否是搜索

    useEffect(() => {
        setIsSearch(!!query.trim());
    }, [query]);

    // 订阅分组变化
    useEffect(() => {
        const updateSpaceTags = (tags) => {
            setSpaceTags(tags);
        };

        SpaceStore.instance.on(UPDATE_SPACE_TAGS, updateSpaceTags);
        return () => {
            SpaceStore.instance.off(UPDATE_SPACE_TAGS, updateSpaceTags);
        };
    }, []);

    // 订阅建议的频道变化
    useEffect(() => {
        const updateSuggestedRooms = (filteredSuggestedRooms: ISuggestedRoom[]): void => {
            setSuggestedRooms(filteredSuggestedRooms);
        };

        SpaceStore.instance.on(UPDATE_FILTERED_SUGGESTED_ROOMS, updateSuggestedRooms);
        return () => {
            SpaceStore.instance.off(UPDATE_FILTERED_SUGGESTED_ROOMS, updateSuggestedRooms);
        };
    }, []);

    // 订阅tagMap改变
    useEffect(() => {
        const onListsUpdated = () => {
            setOrderedLists({ ...RoomListStore.instance.orderedLists });
        };

        RoomListStore.instance.on(LISTS_UPDATE_EVENT, onListsUpdated);
        return () => {
            RoomListStore.instance.off(LISTS_UPDATE_EVENT, onListsUpdated);
        };
    }, []);

    // 生成分组 & 频道列表
    useEffect(() => {
        if (space?.roomId !== SpaceStore.instance.activeSpace) {
            setHierarchyList([]);
            return;
        }

        // 建议的频道（未加入的频道）
        const suggestedTagHierarchy = {
            tagId: DefaultTagID.Suggested,
            tagName: _t("Suggested Rooms"),
            children: suggestedRooms,
        };

        // 已加入的频道
        const joinedHierarchyList = [
            {
                tagId: DefaultTagID.Untagged,
                tagName: _t("channel"),
            },
            ...spaceTags,
        ].map((tagInfo) => ({
            ...tagInfo,
            children: orderedLists[tagInfo.tagId] || [],
        }));

        // 分组频道列表
        const newHierarchyList = [suggestedTagHierarchy, ...joinedHierarchyList];
        const lcQuery = query.toLowerCase().trim();
        for (let i = newHierarchyList.length - 1; i >= 0; i--) {
            const item = newHierarchyList[i];
            item.children = item.children.filter(
                (room) => room.name?.toLowerCase().includes(lcQuery) || room.topic?.toLowerCase().includes(lcQuery),
            );

            // 正常展示时，如果建议的频道和默认分组下没有频道，则删除该分组
            if (!isSearch && !item.children.length && canHiddenGroups.includes(item.tagId as DefaultTagID)) {
                newHierarchyList.splice(i, 1);
            }

            // 如果某个分组下没有满足搜索条件的频道，则从搜索结果中删除该分组
            if (isSearch && !item.children.length) {
                newHierarchyList.splice(i, 1);
            }
        }

        setHierarchyList(newHierarchyList);
    }, [space, suggestedRooms, spaceTags, orderedLists, query, isSearch, canHiddenGroups]);

    return (
        <React.Fragment>
            {hierarchyList.length > 0 ? (
                <ul className="mx_SpaceHierarchy_list" role="tree" aria-label={_t("Space")}>
                    {hierarchyList.map((item) => (
                        <div key={item.tagId} className="mx_RoomSublist">
                            <div className="mx_RoomSublist_headerContainer">
                                <div className="mx_RoomSublist_stickableContainer">
                                    <div className="mx_RoomSublist_stickable">
                                        <div className="mx_RoomSublist_headerText">{item.tagName}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mx_RoomSublist_tiles">
                                {item.children?.map((room) => (
                                    <div
                                        key={room.room_id || room.roomId}
                                        className="mx_RoomTile"
                                        onClick={() => onViewRoomClick(room)}
                                    >
                                        <SpaceChannelAvatar isPrivate={isPrivateRoom(room.join_rule)} />
                                        <div className="mx_RoomTile_titleContainer">
                                            <div className="mx_RoomTile_title" tabIndex={-1}>
                                                <span className="mx_RoomTile_title" dir="auto">
                                                    {room.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </ul>
            ) : (
                <div className="mx_SpaceHierarchy_noResults">
                    {isSearch ? (
                        <>
                            <h3>{_t("No results found")}</h3>
                            <div>{_t("You may want to try a different search or check for typos.")}</div>
                        </>
                    ) : (
                        <>
                            <h3>暂无频道</h3>
                        </>
                    )}
                </div>
            )}
        </React.Fragment>
    );
};

const INITIAL_PAGE_SIZE = 20;

export const useRoomHierarchy = (
    space: Room,
): {
    loading: boolean;
    rooms?: IHierarchyRoom[];
    hierarchy?: RoomHierarchy;
    error?: Error;
    loadMore(pageSize?: number): Promise<void>;
} => {
    const [rooms, setRooms] = useState<IHierarchyRoom[]>([]);
    const [hierarchy, setHierarchy] = useState<RoomHierarchy>();
    const [error, setError] = useState<Error | undefined>();

    const resetHierarchy = useCallback(() => {
        setError(undefined);
        const hierarchy = new RoomHierarchy(space, INITIAL_PAGE_SIZE);

        hierarchy.load().then(() => {
            if (space !== hierarchy.root) return; // discard stale results
            setRooms(hierarchy.rooms ?? []);
        }, setError);
        setHierarchy(hierarchy);
    }, [space]);
    useEffect(resetHierarchy, [resetHierarchy]);

    useDispatcher(defaultDispatcher, (payload) => {
        if (payload.action === Action.UpdateSpaceHierarchy) {
            setRooms([]); // TODO
            resetHierarchy();
        }
    });

    const loadMore = useCallback(
        async (pageSize?: number): Promise<void> => {
            if (!hierarchy || hierarchy.loading || !hierarchy.canLoadMore || hierarchy.noSupport || error) return;

            await hierarchy.load(pageSize).catch(setError);
            setRooms(hierarchy.rooms ?? []);
        },
        [error, hierarchy],
    );

    // Only return the hierarchy if it is for the space requested
    if (hierarchy?.root !== space) {
        return {
            loading: true,
            loadMore,
        };
    }

    return {
        loading: hierarchy.loading,
        rooms,
        hierarchy,
        loadMore,
        error,
    };
};

const SpaceHierarchy: React.FC<IProps> = ({ space, initialText = "", showRoom, additionalButtons }) => {
    const cli = useContext(MatrixClientContext);
    const [query, setQuery] = useState(initialText);

    const onKeyDown = (ev: KeyboardEvent, state: IState): void => {
        const action = getKeyBindingsManager().getAccessibilityAction(ev);
        if (action === KeyBindingAction.ArrowDown && ev.currentTarget.classList.contains("mx_SpaceHierarchy_search")) {
            state.refs[0]?.current?.focus();
        }
    };

    return (
        <RovingTabIndexProvider onKeyDown={onKeyDown} handleHomeEnd handleUpDown>
            {({ onKeyDownHandler }) => {
                return (
                    <div className="mx_SpaceHierarchy_page">
                        <div className="mx_SpaceHierarchy_header">
                            <div className="mx_SpaceHierarchy_title_box">
                                <div className="mx_SpaceHierarchy_title_icon" />
                                <p className="mx_SpaceHierarchy_title">首页</p>
                            </div>
                            <div className="mx_SpaceHierarchy_search_wrap">
                                <SearchBox
                                    className="mx_SpaceHierarchy_search mx_textinput_icon mx_textinput_search"
                                    placeholder={_t("Search names and descriptions")}
                                    onSearch={setQuery}
                                    autoFocus={false}
                                    initialValue={initialText}
                                    onKeyDown={onKeyDownHandler}
                                />
                            </div>
                        </div>
                        <div className="mx_SpaceHierarchy_content">
                            <HierarchyLevel
                                space={space}
                                query={query}
                                onViewRoomClick={(room) => showRoom(cli, room)}
                            />
                        </div>
                    </div>
                );
            }}
        </RovingTabIndexProvider>
    );
};

export default SpaceHierarchy;
