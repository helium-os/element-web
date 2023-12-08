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

import React, { ContextType } from "react";
import MatrixClientContext from "../../../../../contexts/MatrixClientContext";
import { Room } from "matrix-js-sdk/src/models/room";
import RoomNameSetting from "matrix-react-sdk/src/components/views/room_settings/RoomNameSetting";
import RoomTopicSetting from "matrix-react-sdk/src/components/views/room_settings/RoomTopicSetting";
import SpaceAndChannelJoinRuleSettings from "matrix-react-sdk/src/components/views/settings/SpaceAndChannelJoinRuleSettings";
import { _t } from "matrix-react-sdk/src/languageHandler";

interface IProps {
    room: Room;
}

interface IState {}

export default class GeneralRoomSettingsTab extends React.Component<IProps, IState> {
    public static contextType = MatrixClientContext;
    public context: ContextType<typeof MatrixClientContext>;

    public constructor(props: IProps, context: ContextType<typeof MatrixClientContext>) {
        super(props, context);

        this.state = {};
    }

    public render(): React.ReactNode {
        return (
            <>
                <div className="mx_SettingsTab_section">
                    <RoomNameSetting room={this.props.room} />
                    <hr />
                    <RoomTopicSetting room={this.props.room} />
                </div>
                <div className="mx_SettingsTab_section">
                    <p className="mx_SettingsTab_subTitle">{_t("Visibility")}</p>
                    <SpaceAndChannelJoinRuleSettings room={this.props.room} />
                </div>
            </>
        );
    }
}
