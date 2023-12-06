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

import React, { useMemo } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";

import { _t, _td } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { useDispatcher } from "../../../hooks/useDispatcher";
import TabbedView, { Tab } from "../../structures/TabbedView";
import SpaceSettingsGeneralTab from "../spaces/SpaceSettingsGeneralTab";
import SpaceSettingsVisibilityTab from "../spaces/SpaceSettingsVisibilityTab";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import AdvancedRoomSettingsTab from "../settings/tabs/room/AdvancedRoomSettingsTab";
import RolesRoomSettingsTab from "../settings/tabs/room/RolesRoomSettingsTab";
import { Action } from "../../../dispatcher/actions";
import { NonEmptyArray } from "../../../@types/common";

export enum SpaceSettingsTab {
    General = "SPACE_GENERAL_TAB",
    Visibility = "SPACE_VISIBILITY_TAB",
    Roles = "SPACE_ROLES_TAB",
    Advanced = "SPACE_ADVANCED_TAB",
}

interface IProps {
    matrixClient: MatrixClient;
    space: Room;
    onFinished(): void;
}

const SpaceSettingsDialog: React.FC<IProps> = ({ matrixClient: cli, space, onFinished }) => {
    useDispatcher(defaultDispatcher, (payload) => {
        if (payload.action === Action.AfterLeaveRoom && payload.room_id === space.roomId) {
            onFinished();
        }
    });

    const tabs = useMemo(() => {
        return [
            new Tab(
                SpaceSettingsTab.General,
                _t("General"),
                null,
                <SpaceSettingsGeneralTab matrixClient={cli} space={space} />,
            ),
            new Tab(
                SpaceSettingsTab.Visibility,
                _t("Visibility"),
                null,
                <SpaceSettingsVisibilityTab matrixClient={cli} space={space} closeSettingsFn={onFinished} />,
            ),
            new Tab(
                SpaceSettingsTab.Roles,
                _t("Roles & Permissions"),
                null,
                <RolesRoomSettingsTab roomId={space.roomId} />,
            ),
            SettingsStore.getValue(UIFeature.SpaceAdvancedSettings)
                ? new Tab(
                      SpaceSettingsTab.Advanced,
                      _t("Advanced"),
                      null,
                      <AdvancedRoomSettingsTab roomId={space.roomId} closeSettingsFn={onFinished} />,
                  )
                : null,
        ].filter(Boolean) as NonEmptyArray<Tab>;
    }, [cli, space, onFinished]);

    return (
        <BaseDialog className="mx_SpaceSettingsDialog" hasCancel={false} fixedWidth={false} onFinished={onFinished}>
            <div className="mx_SpaceSettingsDialog_content" id="mx_SpaceSettingsDialog">
                <TabbedView title={space.name || _t("Unnamed Space")} tabs={tabs} />
            </div>
        </BaseDialog>
    );
};

export default SpaceSettingsDialog;
