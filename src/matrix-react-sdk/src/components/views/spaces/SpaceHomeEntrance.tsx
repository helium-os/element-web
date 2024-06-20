import React, { useState, useEffect, useCallback } from "react";

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import PageType from "matrix-react-sdk/src/PageTypes";
import { MetaSpace, SpaceKey } from "matrix-react-sdk/src/stores/spaces";
import { ViewRoomPayload } from "matrix-react-sdk/src/dispatcher/payloads/ViewRoomPayload";
import { SdkContextClass } from "matrix-react-sdk/src/contexts/SDKContext";
import { UPDATE_EVENT } from "matrix-react-sdk/src/stores/AsyncStore";
import { _t } from "matrix-react-sdk/src/languageHandler";
import { isInApp } from "matrix-react-sdk/src/utils/env";
import LayoutStore from "matrix-react-sdk/src/stores/LayoutStore";

interface IProps {
    pageType: PageType;
    space: SpaceKey;
}

function SpaceHomeEntrance({ pageType, space }: IProps): JSX.Element {
    const [viewedRoomId, setViewedRoomId] = useState<string>(() => SdkContextClass.instance.roomViewStore.getRoomId());
    const [isSelected, setIsSelected] = useState<boolean>(false);

    const onUpdateViewedRoomId = useCallback(() => {
        setViewedRoomId(SdkContextClass.instance.roomViewStore.getRoomId());
    }, []);

    useEffect(() => {
        SdkContextClass.instance.roomViewStore.addRoomListener(UPDATE_EVENT, onUpdateViewedRoomId);
        return () => {
            SdkContextClass.instance.roomViewStore.removeRoomListener(UPDATE_EVENT, onUpdateViewedRoomId);
        };
    }, [onUpdateViewedRoomId]);

    useEffect(() => {
        setIsSelected(viewedRoomId === space || pageType === PageType.HomePage);
    }, [viewedRoomId, space, pageType]);

    const goSpaceHome = () => {
        if (space === MetaSpace.Home) {
            dis.dispatch({ action: Action.ViewHomePage });
        } else {
            dis.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: space,
                metricsTrigger: undefined, // other
            });
        }

        // 隐藏左侧边栏
        isInApp && LayoutStore.instance.setShowLeftPanel(false);
    };

    return (
        <div
            className={`mx_SpaceHomeTile mx_RoomTile ${isSelected ? "mx_RoomTile_selected" : ""}`}
            onClick={() => goSpaceHome()}
        >
            <span className="mx_RoomTile_iconType mx_RoomTile_iconHome" />
            <div className="mx_RoomTile_titleContainer">
                <div className="mx_RoomTile_title">{_t("Home")}</div>
            </div>
        </div>
    );
}

export default React.memo(SpaceHomeEntrance);
