/*
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

import * as React from "react";
import { useContext, useState } from "react";

import AutoHideScrollbar from "./AutoHideScrollbar";
import { getHomePageUrl } from "../../utils/pages";
import { _tDom } from "../../languageHandler";
import SdkConfig from "../../SdkConfig";
import dis from "../../dispatcher/dispatcher";
import { OwnProfileStore } from "../../stores/OwnProfileStore";
import { ButtonEvent } from "../views/elements/AccessibleButton";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import { useEventEmitter } from "../../hooks/useEventEmitter";
import MatrixClientContext from "../../contexts/MatrixClientContext";
import { AVATAR_SIZE } from "../views/elements/MiniAvatarUploader";
import PosthogTrackers from "../../PosthogTrackers";
import EmbeddedPage from "./EmbeddedPage";
import Button, { ButtonType } from "matrix-react-sdk/src/components/views/button/Button";
import { onCreateRoom } from "matrix-react-sdk/src/components/views/context_menus/SpaceAddChannelContextMenu";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";

const onClickSendDm = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeCreateChatButton", ev);
    dis.dispatch({ action: "view_create_chat" });
};

const onClickNewRoom = (ev: ButtonEvent): void => {
    PosthogTrackers.trackInteraction("WebHomeCreateRoomButton", ev);
    onCreateRoom(SpaceStore.instance.activeSpaceRoom);
};

interface IProps {
    justRegistered?: boolean;
}

const getOwnProfile = (
    userId: string,
): {
    displayName: string;
    avatarUrl?: string;
} => ({
    displayName: OwnProfileStore.instance.displayName || userId,
    avatarUrl: OwnProfileStore.instance.getHttpAvatarUrl(AVATAR_SIZE) ?? undefined,
});

const UserWelcomeTop: React.FC = () => {
    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;
    const [ownProfile, setOwnProfile] = useState(getOwnProfile(userId));
    useEventEmitter(OwnProfileStore.instance, UPDATE_EVENT, () => {
        setOwnProfile(getOwnProfile(userId));
    });

    return (
        <div>
            <h1>{_tDom("Welcome %(name)s", { name: ownProfile.displayName })}</h1>
            <h2>{_tDom("Now, let's help you get started")}</h2>
        </div>
    );
};

const HomePage: React.FC<IProps> = ({ justRegistered = false }) => {
    const config = SdkConfig.get();
    const pageUrl = getHomePageUrl(config);

    if (pageUrl) {
        return <EmbeddedPage className="mx_HomePage" url={pageUrl} scrollbar={true} />;
    }

    return (
        <AutoHideScrollbar className="mx_HomePage mx_HomePage_default" element="main">
            <div className="mx_HomePage_default_wrapper">
                <UserWelcomeTop />
                <div className="mx_HomePage_actionWrap">
                    <div className="mx_HomePage_actionItem mx_HomePage_button_sendDm">
                        <div className="mx_HomePage_actionIcon mx_sendDm_icon"></div>
                        <p className="mx_HomePage_actionText">向同事或朋友发消息</p>
                        <div className="mx_HomePage_actionBtn">
                            <Button type={ButtonType.Primary} onClick={onClickSendDm}>
                                创建私聊
                            </Button>
                        </div>
                    </div>
                    <div className="mx_HomePage_actionItem mx_HomePage_button_createGroup">
                        <div className="mx_HomePage_actionIcon mx_createGroup_icon"></div>
                        <p className="mx_HomePage_actionText">与团队或群协作处理项目</p>
                        <div className="mx_HomePage_actionBtn">
                            <Button type={ButtonType.Primary} onClick={onClickNewRoom}>
                                创建群聊
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AutoHideScrollbar>
    );
};

export default HomePage;
