import React, { memo, useState, useEffect, useCallback, useRef } from "react";
import SearchBar, { SearchScope } from "matrix-react-sdk/src/components/views/rooms/SearchBar";
import { SearchRoomId } from "matrix-react-sdk/src/Searching";
import { RoomSearchView } from "matrix-react-sdk/src/components/structures/RoomSearchView";
import { _t } from "matrix-react-sdk/src/languageHandler";
import SearchBox from "matrix-react-sdk/src/components/structures/SearchBox";
import ContextMenu, {
    aboveRightOf,
    ChevronFace,
    MenuProps,
} from "matrix-react-sdk/src/components/structures/ContextMenu";
import UIStore from "matrix-react-sdk/src/stores/UIStore";
import dis from "matrix-react-sdk/src/dispatcher/dispatcher";
import { ActionPayload } from "matrix-react-sdk/src/dispatcher/payloads";
import { debounce } from "lodash";

interface IProps {}

interface SearchArea {
    show: boolean;
    position: MenuProps;
}
export interface SearchFilter {
    query: string;
    scope: SearchScope;
    roomIds: SearchRoomId;
}

const contextMenuHorizontalCenter = true;

const MessageSearch: React.FC<IProps> = () => {
    const dispatcherRef = useRef(null);
    const searchBtn = useRef(null);

    const [searchArea, setSearchArea] = useState<SearchArea>({
        show: false,
        position: null,
    });

    const [searchFilter, setSearchFilter] = useState<SearchFilter>({} as SearchFilter);

    // 计算搜索弹窗位置
    const calcSearchAreaPosition = useCallback(() => {
        const searchBtnRect = searchBtn.current.getBoundingClientRect();
        return {
            ...aboveRightOf(searchBtnRect, ChevronFace.None, -searchBtnRect.height, contextMenuHorizontalCenter),
            menuWidth: UIStore.instance.windowWidth * 0.65,
        };
    }, []);

    const setSearchAreaPosition = useCallback(() => {
        setSearchArea((prevState) => ({
            ...prevState,
            position: calcSearchAreaPosition(),
        }));
    }, [calcSearchAreaPosition]);

    const showSearchArea = useCallback(() => {
        setSearchArea({
            show: true,
            position: calcSearchAreaPosition(),
        });
    }, [calcSearchAreaPosition]);

    const closeSearchArea = () => {
        setSearchArea({
            show: false,
            position: null,
        });
    };

    useEffect(() => {
        const onAction = (payload: ActionPayload) => {
            switch (payload.action) {
                case "focus_search":
                    showSearchArea();
                    break;
            }
        };

        dispatcherRef.current = dis.register(onAction);
        return () => {
            dispatcherRef.current && dis.unregister(dispatcherRef.current);
        };
    }, [showSearchArea]);

    useEffect(() => {
        const debounceSetSearchAreaPosition = debounce(setSearchAreaPosition, 100);

        window.addEventListener("resize", debounceSetSearchAreaPosition, false);
        return () => {
            window.removeEventListener("resize", debounceSetSearchAreaPosition, false);
        };
    }, [setSearchAreaPosition]);

    const onFilterChange = useCallback((filter: SearchFilter) => {
        setSearchFilter(filter);
    }, []);

    return (
        <>
            <div className="mx_MessageSearch_btn" ref={searchBtn} onClick={showSearchArea}>
                <SearchBox placeholder={_t("Search")} autoFocus={false} />
            </div>
            {searchArea.show && searchArea.position && (
                <ContextMenu
                    {...searchArea.position}
                    horizontalCenter={contextMenuHorizontalCenter}
                    onFinished={closeSearchArea}
                >
                    <div className="mx_MessageSearch_wrap" style={{ maxHeight: UIStore.instance.windowHeight * 0.6 }}>
                        <SearchBar onFilterChange={onFilterChange} />
                        <RoomSearchView
                            query={searchFilter.query}
                            scope={searchFilter.scope}
                            roomIds={searchFilter.roomIds}
                            onFinished={closeSearchArea}
                        />
                    </div>
                </ContextMenu>
            )}
        </>
    );
};

export default memo(MessageSearch);
