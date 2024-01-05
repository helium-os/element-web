/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import RoomAvatarSettings from "matrix-react-sdk/src/components/views/room_settings/RoomAvatarSetting";
import RoomNameSetting from "matrix-react-sdk/src/components/views/room_settings/RoomNameSetting";
import { _t } from "matrix-react-sdk/src/languageHandler";
import SpaceAndChannelJoinRuleSettings from "matrix-react-sdk/src/components/views/settings/SpaceAndChannelJoinRuleSettings";

interface IProps {
    space: Room;
}

const SpaceSettingsGeneralTab: React.FC<IProps> = ({ space }) => {
    return (
        <>
            <div className="mx_SettingsTab_section">
                <div className="mx_SettingsTab_avatarBox">
                    <RoomAvatarSettings room={space} size={100} autoUpload={true} />
                    <label className="mx_SettingsTab_tips">上传的图片必须为 jpg 或 png 格式。</label>
                </div>
                <hr />
                <RoomNameSetting room={space} />
            </div>
            <div className="mx_SettingsTab_section">
                <p className="mx_SettingsTab_subTitle">{_t("Visibility")}</p>
                <SpaceAndChannelJoinRuleSettings room={space} />
            </div>
        </>
    );
};

export default memo(SpaceSettingsGeneralTab);
