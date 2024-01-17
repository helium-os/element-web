/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, { useState, useEffect, useRef, memo, useContext } from "react";
import RoomAndChannelAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAndChannelAvatar";
import { SearchRoomId } from "matrix-react-sdk/src/Searching";
import Field, { SelectedUserOrRoomTile } from "matrix-react-sdk/src/components/views/elements/Field";
import { SearchFilter } from "matrix-react-sdk/src/components/views/toolbar/MessageSearch";
import RoomListStore from "matrix-react-sdk/src/stores/room-list/RoomListStore";
import { Room } from "matrix-js-sdk/src/models/room";
import MatrixClientContext from "matrix-react-sdk/src/contexts/MatrixClientContext";
import { SDKContext, SdkContextClass } from "matrix-react-sdk/src/contexts/SDKContext";
import { UPDATE_EVENT } from "matrix-react-sdk/src/stores/AsyncStore";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { UPDATE_SELECTED_SPACE } from "matrix-react-sdk/src/stores/spaces";
import useFnRef from "matrix-react-sdk/src/hooks/useFnRef";
import { RoomType } from "matrix-js-sdk/src/@types/event";
import { MatrixClient } from "matrix-js-sdk/src/client";

export enum SearchScope {
    All = "All",
    Space = "Space",
    Room = "Room",
}

type FilterChangeFn = (filter: SearchFilter) => void;

interface IProps {
    onFilterChange: FilterChangeFn;
}

const getActiveRoom = (cli: MatrixClient, context: SdkContextClass) => {
    if (!cli || !context) return;

    const roomId = context.roomViewStore.getRoomId();
    const room = cli.getRoom(roomId);

    if (room?.getType() === RoomType.Space) return;

    return room;
};

const SearchBar: React.FC<IProps> = ({ onFilterChange }) => {
    const cli = useContext(MatrixClientContext);
    const context = useContext(SDKContext);

    const inputRef = useRef(null);

    const onFilterChangeRef = useFnRef<FilterChangeFn>(onFilterChange);

    const [filterText, setFilterText] = useState<string>("");

    const [scope, setScope] = useState<SearchScope>(SearchScope.All);

    const [activeSpace, setActiveSpace] = useState<Room>(() => SpaceStore.instance.activeSpaceRoom); // 当前的社区
    const [activeRoom, setActiveRoom] = useState<Room>(() => getActiveRoom(cli, context)); // 当前的room

    const [selectedRoom, setSelectedRoom] = useState<Room>(null); // 选中的搜索room

    const [roomIds, setRoomIds] = useState<SearchRoomId>(); // 需要搜索的roomId列表

    // 订阅社区切换
    useEffect(() => {
        const onSelectedSpaceChange = () => {
            setActiveSpace(SpaceStore.instance.activeSpaceRoom);
        };

        SpaceStore.instance.on(UPDATE_SELECTED_SPACE, onSelectedSpaceChange);

        return () => {
            SpaceStore.instance.off(UPDATE_SELECTED_SPACE, onSelectedSpaceChange);
        };
    }, []);

    // 订阅room切换
    useEffect(() => {
        const onRoomViewStoreUpdate = () => {
            const room = getActiveRoom(cli, context);
            setActiveRoom(room);
        };

        context.roomViewStore.on(UPDATE_EVENT, onRoomViewStoreUpdate);

        return () => {
            context.roomViewStore.off(UPDATE_EVENT, onRoomViewStoreUpdate);
        };
    }, [cli, context, activeRoom]);

    // scope改变后，修改当前选中的搜索room，并重新生成要搜索的roomId
    useEffect(() => {
        let selectedRoom = null,
            roomId;
        switch (scope) {
            case SearchScope.Space:
                // 选中社区时，从当前社区下的所有room进行搜索
                selectedRoom = activeSpace;
                roomId = RoomListStore.instance.getPlausibleRooms().map((item) => item.roomId);
                break;
            case SearchScope.Room:
                // 选中room时，只搜索当前room
                selectedRoom = activeRoom;
                roomId = activeRoom?.roomId;
                break;
        }
        setRoomIds(roomId);
        setSelectedRoom(selectedRoom);
    }, [scope, activeSpace, activeRoom]);

    // 搜索条件改变
    useEffect(() => {
        onFilterChangeRef.current?.({
            query: filterText.trim(),
            scope,
            roomIds,
        });
    }, [filterText, scope, roomIds]);

    const updateFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(e.target.value);
    };

    const onScopeBtnClick = (scope: SearchScope, inputFocus: boolean = true) => {
        setScope(scope);
        inputFocus && inputRef.current?.focus();
    };

    const onDeleteSelectedRoom = () => {
        onScopeBtnClick(SearchScope.All);
    };

    const getSelectedRoomComponent = () => {
        if (!selectedRoom) return null;

        return (
            <SelectedUserOrRoomTile
                avatar={<RoomAndChannelAvatar room={selectedRoom} avatarSize={16} />}
                name={selectedRoom.name}
                onRemove={() => onDeleteSelectedRoom()}
            />
        );
    };

    return (
        <>
            <div className="mx_SearchBar_input">
                <Field
                    type="text"
                    inputRef={inputRef}
                    usePlaceholderAsHint={!selectedRoom}
                    placeholder={"在所有社区中搜索"}
                    autoFocus={true}
                    autoComplete="off"
                    prefixComponent={getSelectedRoomComponent()}
                    hasPrefixContainer={false}
                    clearEnable={true}
                    value={filterText}
                    onChange={updateFilter}
                />
            </div>
            <ul className="mx_SearchBar_buttons" role="radiogroup">
                {[activeSpace, activeRoom].map((room) => {
                    return room && room.roomId !== selectedRoom?.roomId ? (
                        <li
                            onClick={() =>
                                onScopeBtnClick(
                                    room.getType() === RoomType.Space ? SearchScope.Space : SearchScope.Room,
                                )
                            }
                        >
                            <span className="mx_SearchBar_button_icon" />在
                            <label className="mx_MessageSearch_divider">
                                <RoomAndChannelAvatar room={room} avatarSize={20} />
                                {room.name}
                            </label>
                            中搜索
                        </li>
                    ) : null;
                })}
            </ul>
        </>
    );
};

export default memo(SearchBar);
