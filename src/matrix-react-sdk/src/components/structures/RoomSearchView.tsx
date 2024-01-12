/*
Copyright 2015 - 2023 The Matrix.org Foundation C.I.C.

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

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ISearchResults } from "matrix-js-sdk/src/@types/search";
import { IThreadBundledRelationship, MatrixEvent } from "matrix-js-sdk/src/models/event";
import { THREAD_RELATION_TYPE } from "matrix-js-sdk/src/models/thread";

import { SearchScope } from "../views/rooms/SearchBar";
import Spinner from "../views/elements/Spinner";
import { _t } from "../../languageHandler";
import { haveRendererForEvent } from "../../events/EventTileFactory";
import SearchResultTile from "../views/rooms/SearchResultTile";
import eventSearch, { searchPagination, SearchRoomId } from "../../Searching";
import Modal from "../../Modal";
import ErrorDialog from "../views/dialogs/ErrorDialog";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import RoomContext from "../../contexts/RoomContext";
import { Room } from "matrix-js-sdk/src/models/room";
import RoomAndChannelAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAndChannelAvatar";
import MessageTimestamp from "matrix-react-sdk/src/components/views/messages/MessageTimestamp";
import ScrollLoader from "matrix-react-sdk/src/components/structures/ScrollLoader";

interface IProps {
    query: string;
    scope: SearchScope;
    roomIds: SearchRoomId;
    onFinished?: () => void;
}

const permalinkCreators: Record<string, RoomPermalinkCreator> = {};

export const RoomSearchView = ({ query, scope, roomIds, onFinished }: IProps) => {
    const client = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);

    const debounceTimer = useRef<number>();

    const abortControllerRef = useRef<AbortController>(null);
    const aborted = useRef(false);

    const [inProgress, setInProgress] = useState(false);
    const [highlights, setHighlights] = useState<string[] | null>(null);
    const [results, setResults] = useState<ISearchResults | null>(null);

    useEffect(() => {
        return () => {
            stopAllPermalinkCreators();
        };
    }, []);

    useEffect(() => {
        if (!query?.trim()) {
            setResults(null);
        }
    }, [query]);

    useEffect(() => {
        const onSearch = (query: string, scope: SearchScope, roomIds: SearchRoomId): void => {
            if (!query || (scope !== SearchScope.All && !roomIds)) return;

            setResults(null);
            abortControllerRef.current = new AbortController();
            const promise = eventSearch(query, roomIds, abortControllerRef.current.signal);
            aborted.current = false;
            handleSearchResult(promise);
        };

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = window.setTimeout(() => {
            onSearch(query, scope, roomIds);
        }, 500);

        return () => {
            aborted.current = true;
            abortControllerRef.current?.abort();
        };
    }, [query, scope, roomIds]);

    const loadMore = (): void => {
        if (!results.next_batch) return;

        const searchPromise = searchPagination(results);
        handleSearchResult(searchPromise);
    };

    const handleSearchResult = useCallback(
        (searchPromise: Promise<ISearchResults>): Promise<boolean> => {
            setInProgress(true);

            return searchPromise
                .then(async (results): Promise<boolean> => {
                    if (aborted.current) {
                        return false;
                    }

                    let highlights = results.highlights;
                    if (!highlights.includes(query)) {
                        highlights = highlights.concat(query);
                    }

                    highlights = highlights.sort(function (a, b) {
                        return b.length - a.length;
                    });

                    for (const result of results.results) {
                        for (const event of result.context.getTimeline()) {
                            const bundledRelationship = event.getServerAggregatedRelation<IThreadBundledRelationship>(
                                THREAD_RELATION_TYPE.name,
                            );
                            if (!bundledRelationship || event.getThread()) continue;
                            const room = client.getRoom(event.getRoomId());
                            const thread = room?.findThreadForEvent(event);
                            if (thread) {
                                event.setThread(thread);
                            } else {
                                room?.createThread(event.getId()!, event, [], true);
                            }
                        }
                    }

                    setHighlights(highlights);
                    setResults({ ...results });
                })
                .catch((error) => {
                    if (aborted.current) {
                        return false;
                    }
                    Modal.createDialog(ErrorDialog, {
                        title: _t("Search failed"),
                        description:
                            error?.message ?? _t("Server may be unavailable, overloaded, or search timed out :("),
                    });
                    return false;
                })
                .finally(() => {
                    setInProgress(false);
                });
        },
        [client, query],
    );

    const getPermalinkCreatorForRoom = (room: Room): RoomPermalinkCreator => {
        if (permalinkCreators[room.roomId]) return permalinkCreators[room.roomId];

        permalinkCreators[room.roomId] = new RoomPermalinkCreator(room);
        permalinkCreators[room.roomId].start();
        return permalinkCreators[room.roomId];
    };

    const stopAllPermalinkCreators = (): void => {
        if (!permalinkCreators) return;
        for (const roomId of Object.keys(permalinkCreators)) {
            permalinkCreators[roomId].stop();
        }
    };

    const onJumpToEvent = (resultLink: string) => {
        if (resultLink) {
            window.location.href = resultLink;
        }
        onFinished?.();
    };

    const getContent = () => {
        const ret: JSX.Element[] = [];

        let lastRoomId: string | undefined;
        let mergedTimeline: MatrixEvent[] = [];
        let ourEventsIndexes: number[] = [];

        for (let i = 0; i < results?.results?.length; i++) {
            const result = results.results[i];

            const mxEv = result.context.getEvent();
            const roomId = mxEv.getRoomId();
            const room = client.getRoom(roomId);
            if (!room) {
                continue;
            }

            if (!haveRendererForEvent(mxEv, roomContext.showHiddenEvents)) {
                // XXX: can this ever happen? It will make the result count
                // not match the displayed count.
                continue;
            }

            const resultLink = "#/room/" + roomId + "/" + mxEv.getId();

            // merging two successive search result if the query is present in both of them
            const currentTimeline = result.context.getTimeline();
            const nextTimeline = i > 0 ? results.results[i - 1].context.getTimeline() : [];

            if (i > 0 && currentTimeline[currentTimeline.length - 1].getId() == nextTimeline[0].getId()) {
                // if this is the first searchResult we merge then add all values of the current searchResult
                if (mergedTimeline.length == 0) {
                    for (let j = mergedTimeline.length == 0 ? 0 : 1; j < result.context.getTimeline().length; j++) {
                        mergedTimeline.push(currentTimeline[j]);
                    }
                    ourEventsIndexes.push(result.context.getOurEventIndex());
                }

                // merge the events of the next searchResult
                for (let j = 1; j < nextTimeline.length; j++) {
                    mergedTimeline.push(nextTimeline[j]);
                }

                // add the index of the matching event of the next searchResult
                ourEventsIndexes.push(
                    ourEventsIndexes[ourEventsIndexes.length - 1] +
                        results.results[i - 1].context.getOurEventIndex() +
                        1,
                );

                continue;
            }

            if (mergedTimeline.length == 0) {
                mergedTimeline = result.context.getTimeline();
                ourEventsIndexes = [];
                ourEventsIndexes.push(result.context.getOurEventIndex());
            }

            let searchResultTileHeader;
            if (scope !== SearchScope.Room) {
                // if (roomId !== lastRoomId) {
                const parentSpace = room.getParents()?.[0];
                searchResultTileHeader = (
                    <li className="mx_searchResultTile_header" key={mxEv.getId() + "-room"}>
                        {scope === SearchScope.All && parentSpace ? (
                            <>
                                {parentSpace.name}
                                <label className="mx_MessageSearch_divider">-</label>
                            </>
                        ) : (
                            ""
                        )}
                        <RoomAndChannelAvatar room={room} avatarSize={16} /> {room.name}
                        <label className="mx_MessageSearch_divider">-</label>
                        <MessageTimestamp showRelative={true} showTwelveHour={false} ts={mxEv.getTs()} />
                    </li>
                );
                // lastRoomId = roomId;
                // }
            }

            ret.push(
                <SearchResultTile
                    key={mxEv.getId()}
                    header={searchResultTileHeader}
                    timeline={mergedTimeline}
                    ourEventsIndexes={ourEventsIndexes}
                    searchHighlights={highlights ?? []}
                    resultLink={resultLink}
                    permalinkCreator={getPermalinkCreatorForRoom(room)}
                    onClick={() => onJumpToEvent(resultLink)}
                />,
            );

            ourEventsIndexes = [];
            mergedTimeline = [];
        }

        if (!results?.next_batch) {
            ret.push(
                <li className="mx_SearchResult_noMore">
                    {!results?.results?.length ? "没有与您的查询相匹配的结果" : _t("No more results")}
                </li>,
            );
        }

        return ret;
    };

    return (
        <>
            <ScrollLoader className="mx_searchResultsPanel_wrap" loadMore={loadMore}>
                <ul className="mx_searchResultsPanel_inner">
                    {results && getContent()}
                    {inProgress && (
                        <li>
                            <Spinner />
                        </li>
                    )}
                </ul>
            </ScrollLoader>
        </>
    );
};
