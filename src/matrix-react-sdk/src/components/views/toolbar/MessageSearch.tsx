import React, { memo, useState, useCallback, useRef } from "react";
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
const MessageSearch: React.FC<IProps> = () => {
    const searchBtn = useRef(null);

    const contextMenuHorizontalCenter = true;

    const [searchArea, setSearchArea] = useState<SearchArea>({
        show: false,
        position: null,
    });

    const [searchFilter, setSearchFilter] = useState<SearchFilter>({} as SearchFilter);

    const showSearchArea = () => {
        const searchBtnRect = searchBtn.current.getBoundingClientRect();
        setSearchArea({
            show: true,
            position: {
                ...aboveRightOf(searchBtnRect, ChevronFace.None, -searchBtnRect.height, contextMenuHorizontalCenter),
                menuWidth: UIStore.instance.windowWidth * 0.65,
            },
        });
    };

    const closeSearchArea = () => {
        setSearchArea({
            show: false,
            position: null,
        });
    };

    const onFilterChange = useCallback((filter: SearchFilter) => {
        setSearchFilter(filter);
    }, []);

    return (
        <>
            <div className="mx_MessageSearch_btn" ref={searchBtn} onClick={showSearchArea}>
                <SearchBox ref={searchBtn} placeholder={_t("Search")} autoFocus={false} />
            </div>
            {searchArea.show && searchArea.position && (
                <ContextMenu
                    {...searchArea.position}
                    horizontalCenter={contextMenuHorizontalCenter}
                    onFinished={closeSearchArea}
                >
                    <div className="mx_MessageSearch_wrap">
                        <SearchBar
                            // searchInProgress={searchInfo?.inProgress}
                            onFilterChange={onFilterChange}
                        />
                        <RoomSearchView
                            query={searchFilter.query}
                            scope={searchFilter.scope}
                            roomIds={searchFilter.roomIds}
                            // onUpdate={onSearchUpdate}
                        />
                    </div>
                </ContextMenu>
            )}
        </>
    );
};

export default memo(MessageSearch);
