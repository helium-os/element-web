/*
Copyright 2019 New Vector Ltd

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

import React, { memo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import RoomNameSetting from "matrix-react-sdk/src/components/views/room_settings/RoomNameSetting";
import RoomTopicSetting from "matrix-react-sdk/src/components/views/room_settings/RoomTopicSetting";
import SpaceAndChannelJoinRuleSettings from "matrix-react-sdk/src/components/views/settings/SpaceAndChannelJoinRuleSettings";
import { _t } from "matrix-react-sdk/src/languageHandler";
import ChannelEnableSendMsgSettings from "matrix-react-sdk/src/components/views/settings/ChannelEnableSendMsgSettings";
import ChannelEnableMemberListSettings from "matrix-react-sdk/src/components/views/settings/ChannelEnableMemberListSettings";

interface IProps {
    room: Room;
}

const GeneralRoomSettingsTab: React.FC<IProps> = ({ room }) => {
    return (
        <>
            <div className="mx_SettingsTab_section">
                <RoomNameSetting room={room} />
                <hr />
                <RoomTopicSetting room={room} />
            </div>
            <div className="mx_SettingsTab_section">
                <p className="mx_SettingsTab_subTitle">{_t("Visibility")}</p>
                <SpaceAndChannelJoinRuleSettings room={room} />
            </div>
            <div className="mx_SettingsTab_section">
                <ChannelEnableSendMsgSettings room={room} />
            </div>
            <div className="mx_SettingsTab_section">
                <ChannelEnableMemberListSettings room={room} />
            </div>
        </>
    );
};
export default memo(GeneralRoomSettingsTab);
