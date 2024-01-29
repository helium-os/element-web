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

import { Optional } from "matrix-events-sdk";
import React, { useContext, useEffect, useRef, useState, memo } from "react";
import { EventTimelineSet } from "matrix-js-sdk/src/models/event-timeline-set";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";
import { Room } from "matrix-js-sdk/src/models/room";

import BaseCard from "../views/right_panel/BaseCard";
import ResizeNotifier from "../../utils/ResizeNotifier";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { _t } from "../../languageHandler";
import { ContextMenuButton } from "../../accessibility/context_menu/ContextMenuButton";
import DropdownButton from "matrix-react-sdk/src/components/views/elements/DropdownButton";
import { aboveRightOf, MenuItemRadio, useContextMenu } from "./ContextMenu";
import RoomContext, { TimelineRenderingType } from "../../contexts/RoomContext";
import TimelinePanel from "./TimelinePanel";
import { Layout } from "../../settings/enums/Layout";
import { RoomPermalinkCreator } from "../../utils/permalinks/Permalinks";
import Measured from "../views/elements/Measured";
import PosthogTrackers from "../../PosthogTrackers";
import { ButtonEvent } from "../views/elements/AccessibleButton";
import Spinner from "../views/elements/Spinner";
import IconizedContextMenu, {
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "matrix-react-sdk/src/components/views/context_menus/IconizedContextMenu";

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    permalinkCreator: RoomPermalinkCreator;
}

export enum ThreadFilterType {
    My,
    All,
}

type ThreadPanelHeaderOption = {
    label: string;
    description?: string;
    key: ThreadFilterType;
};

export const ThreadPanelHeaderFilterOptionItem: React.FC<
    ThreadPanelHeaderOption & {
        onClick: () => void;
        isSelected: boolean;
    }
> = ({ label, description, onClick, isSelected }) => {
    return (
        <MenuItemRadio active={isSelected} className="mx_ThreadPanel_Header_FilterOptionItem" onClick={onClick}>
            <span>{label}</span>
            {description && <span>{description}</span>}
        </MenuItemRadio>
    );
};

export const ThreadPanelHeader: React.FC<{
    filterOption: ThreadFilterType;
    setFilterOption: (filterOption: ThreadFilterType) => void;
    empty: boolean;
}> = ({ filterOption, setFilterOption, empty }) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu<HTMLElement>();
    const options: readonly ThreadPanelHeaderOption[] = [
        {
            label: _t("All threads"),
            description: _t("Shows all threads from current room"),
            key: ThreadFilterType.All,
        },
        {
            label: _t("My threads"),
            description: _t("Shows all threads you've participated in"),
            key: ThreadFilterType.My,
        },
    ];

    const value = options.find((option) => option.key === filterOption);

    const contextMenuOptions = (
        <IconizedContextMenuOptionList first>
            {options.map((opt) => (
                <IconizedContextMenuRadio
                    key={opt.key}
                    label={opt.label}
                    active={opt === value}
                    onClick={() => {
                        setFilterOption(opt.key);
                        closeMenu();
                    }}
                />
            ))}
        </IconizedContextMenuOptionList>
    );

    const renderContextMenu = () => {
        if (!menuDisplayed || !button) return null;

        const rect = button.current.getBoundingClientRect();

        return (
            <IconizedContextMenu compact {...aboveRightOf(rect)} menuWidth={178} onFinished={closeMenu}>
                {contextMenuOptions}
            </IconizedContextMenu>
        );
    };

    return (
        <>
            {!empty && (
                <>
                    <ContextMenuButton
                        inputRef={button}
                        isExpanded={menuDisplayed}
                        onClick={(ev: ButtonEvent) => {
                            openMenu();
                            PosthogTrackers.trackInteraction("WebRightPanelThreadPanelFilterDropdown", ev);
                        }}
                    >
                        <DropdownButton className="mx_ThreadPanel_header_dropdownBox">{value?.label}</DropdownButton>
                    </ContextMenuButton>
                    {renderContextMenu()}
                </>
            )}
        </>
    );
};

interface EmptyThreadIProps {
    hasThreads: boolean;
    filterOption: ThreadFilterType;
    showAllThreadsCallback: () => void;
}

const EmptyThread: React.FC<EmptyThreadIProps> = ({ hasThreads, filterOption, showAllThreadsCallback }) => {
    let body: JSX.Element;
    if (hasThreads) {
        body = (
            <>
                <p>
                    {_t(
                        "Reply to an ongoing thread or use “%(replyInThread)s” " +
                            "when hovering over a message to start a new one.",
                        {
                            replyInThread: _t("Reply in thread"),
                        },
                    )}
                </p>
                <p>
                    {/* Always display that paragraph to prevent layout shift when hiding the button */}
                    {filterOption === ThreadFilterType.My ? (
                        <button onClick={showAllThreadsCallback}>{_t("Show all threads")}</button>
                    ) : (
                        <>&nbsp;</>
                    )}
                </p>
            </>
        );
    } else {
        body = (
            <>
                <p>{_t("Threads help keep your conversations on-topic and easy to track.")}</p>
                <p className="mx_ThreadPanel_empty_tip">
                    {_t(
                        "<b>Tip:</b> Use “%(replyInThread)s” when hovering over a message.",
                        {
                            replyInThread: _t("Reply in thread"),
                        },
                        {
                            b: (sub) => <b>{sub}</b>,
                        },
                    )}
                </p>
            </>
        );
    }

    return (
        <aside className="mx_ThreadPanel_empty">
            <div className="mx_ThreadPanel_largeIcon" />
            <h2>{_t("Keep discussions organised with threads")}</h2>
            {body}
        </aside>
    );
};

const ThreadPanel: React.FC<IProps> = ({ roomId, onClose, permalinkCreator }) => {
    const mxClient = useContext(MatrixClientContext);
    const roomContext = useContext(RoomContext);
    const timelinePanel = useRef<TimelinePanel | null>(null);
    const card = useRef<HTMLDivElement | null>(null);

    const [filterOption, setFilterOption] = useState<ThreadFilterType>(ThreadFilterType.All);
    const [room, setRoom] = useState<Room | null>(null);
    const [narrow, setNarrow] = useState<boolean>(false);

    const timelineSet: Optional<EventTimelineSet> =
        filterOption === ThreadFilterType.My ? room?.threadsTimelineSets[1] : room?.threadsTimelineSets[0];

    const [hasThreads, setHasThreads] = useState<boolean>(false);

    const resetHasThreads = (room: Room) => {
        setHasThreads(Boolean(room?.threadsTimelineSets?.[0]?.getLiveTimeline()?.getEvents()?.length));
    };

    /**
     * 订阅新创建的消息列事件，将threadRootEvent添加到threadsTimelines里
     *
     * bugfix:为了解决其他成员新创建的消息列在当前用户的消息列列表里不展示，只有该消息列有第二条回复 或者 刷新页面后才展示的bug
     *
     * 原因：
     * js-sdk里通过updateThreadRootEvents方法更新threadsTimelines
     * js-sdk里创建消息列成功以后会调用updateThreadRootEvents方法，但是该方法里判断了只有thread.length > 0的时候才更新threadsTimeline
     * 所以已存在的消息列有新的回复时会及时更新，而新创建的消息列因为此时thread.length为0，虽然调用了方法，但是并没有将新创建的threadRootEvent添加到threadsTimeline里
     *
     * 为什么这样改？
     * 基于上述原因，可以通过重写updateThreadRootEvents方法来实现，判断只要thread存在就执行方法，但是因为js-sdk里该方法为实例方法，并非原型方法，所以不能这样修改
     * js-sdk里room createThread完成后会emit ThreadEvent.New事件，最后决定通过订阅该事件，然后触发updateThreadRootEvent
     */
    useEffect(() => {
        if (!room) return;

        const onNewThread = (thread: Thread, toStartOfTimeline: boolean) => {
            if (!thread) return;

            room.updateThreadRootEvent(room.threadsTimelineSets?.[0], thread, toStartOfTimeline, false);
            if (thread.hasCurrentUserParticipated) {
                room.updateThreadRootEvent(room.threadsTimelineSets?.[1], thread, toStartOfTimeline, false);
            }

            resetHasThreads(room);
        };

        resetHasThreads(room);
        room.on(ThreadEvent.New, onNewThread);
        return () => {
            room.off(ThreadEvent.New, onNewThread);
        };
    }, [room]);

    useEffect(() => {
        const room = mxClient.getRoom(roomId);
        room
            ?.createThreadsTimelineSets()
            .then(() => room.fetchRoomThreads())
            .then(() => {
                setFilterOption(ThreadFilterType.All);
                setRoom(room);
            });
    }, [mxClient, roomId]);

    useEffect(() => {
        if (timelineSet && !Thread.hasServerSideSupport) {
            timelinePanel.current?.refreshTimeline();
        }
    }, [timelineSet, timelinePanel]);

    return (
        <RoomContext.Provider
            value={{
                ...roomContext,
                timelineRenderingType: TimelineRenderingType.ThreadsList,
                showHiddenEvents: true,
                narrow,
            }}
        >
            <BaseCard
                title={_t("Threads")}
                headerButton={
                    <ThreadPanelHeader
                        filterOption={filterOption}
                        setFilterOption={setFilterOption}
                        empty={!hasThreads}
                    />
                }
                className="mx_ThreadPanel"
                onClose={onClose}
                withoutScrollContainer={true}
                ref={card}
            >
                {card.current && <Measured sensor={card.current} onMeasurement={setNarrow} />}
                {/*<div className="mx_ThreadPanel_search_box">搜索框</div>*/}
                {timelineSet ? (
                    <div className="mx_ThreadView_timelinePanelWrapper">
                        <TimelinePanel
                            key={filterOption + ":" + (timelineSet.getFilter()?.filterId ?? roomId)}
                            ref={timelinePanel}
                            showReadReceipts={false} // No RR support in thread's list
                            manageReadReceipts={false} // No RR support in thread's list
                            manageReadMarkers={false} // No RM support in thread's list
                            sendReadReceiptOnLoad={false} // No RR support in thread's list
                            timelineSet={timelineSet}
                            showUrlPreview={false} // No URL previews at the threads list level
                            empty={
                                <EmptyThread
                                    hasThreads={hasThreads}
                                    filterOption={filterOption}
                                    showAllThreadsCallback={() => setFilterOption(ThreadFilterType.All)}
                                />
                            }
                            alwaysShowTimestamps={true}
                            layout={Layout.Group}
                            hideThreadedMessages={false}
                            hidden={false}
                            showReactions={false}
                            className="mx_RoomView_messagePanel"
                            membersLoaded={true}
                            permalinkCreator={permalinkCreator}
                            disableGrouping={true}
                        />
                    </div>
                ) : (
                    <div className="mx_AutoHideScrollbar">
                        <Spinner />
                    </div>
                )}
            </BaseCard>
        </RoomContext.Provider>
    );
};
export default memo(ThreadPanel);
