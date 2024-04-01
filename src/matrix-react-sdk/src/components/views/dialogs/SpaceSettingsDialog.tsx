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

import React, { memo, useEffect, useMemo, useState } from "react";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { MatrixClient } from "matrix-js-sdk/src/client";

import { _t } from "../../../languageHandler";
import RoomSettingsBaseDialog from "./RoomSettingsBaseDialog";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { useDispatcher } from "../../../hooks/useDispatcher";
import TabbedView, { Tab } from "../../structures/TabbedView";
import SpaceSettingsGeneralTab from "../spaces/SpaceSettingsGeneralTab";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import AdvancedRoomSettingsTab from "../settings/tabs/room/AdvancedRoomSettingsTab";
import RolesRoomSettingsTab from "../settings/tabs/room/RolesRoomSettingsTab";
import { Action } from "../../../dispatcher/actions";
import { NonEmptyArray } from "../../../@types/common";
import { useTypedEventEmitter } from "matrix-react-sdk/src/hooks/useEventEmitter";
import Button, { ButtonSize, ButtonType } from "matrix-react-sdk/src/components/views/button/Button";
import { deleteSpace, leaveSpace } from "matrix-react-sdk/src/utils/leave-behaviour";
import trashSvg from "matrix-react-sdk/res/img/feather-customised/trash.svg";
import leaveSvg from "matrix-react-sdk/res/img/feather-customised/leave.svg";
import { StateEventType } from "matrix-react-sdk/src/powerLevel";
import useRoomPermissions from "matrix-react-sdk/src/hooks/room/useRoomPermissions";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { SdkContextClass } from "matrix-react-sdk/src/contexts/SDKContext";
import { UPDATE_NOT_ALLOWED_LEAVE_SPACES } from "matrix-react-sdk/src/stores/spaces";

export enum SpaceSettingsTab {
    General = "SPACE_GENERAL_TAB",
    Visibility = "SPACE_VISIBILITY_TAB",
    Roles = "SPACE_ROLES_TAB",
    Advanced = "SPACE_ADVANCED_TAB",
}

interface IProps {
    cli: MatrixClient;
    space: Room;
    onFinished(): void;
}

const SpaceSettingsDialog: React.FC<IProps> = ({ cli, space, onFinished }) => {
    // 是否有删除社区、展示用户列表的权限
    const [canDelete, displayMemberList] = useRoomPermissions(
        cli,
        space,
        useMemo(
            () => [
                {
                    eventType: StateEventType.Delete,
                    state: false,
                },
                {
                    eventType: StateEventType.DisplayMemberList,
                    state: true,
                },
            ],
            [],
        ),
        cli.getSafeUserId(),
    );

    const [spaceName, setSpaceName] = useState<string>("");

    const [allowLeave, setAllowLeave] = useState<boolean>(); // 当前社区是否允许成员离开

    useEffect(() => {
        const updateAllowLeave = () => {
            setAllowLeave(!SpaceStore.instance.notAllowedLeaveSpaces.includes(space.roomId));
        };

        updateAllowLeave();
        SdkContextClass.instance.spaceStore.on(UPDATE_NOT_ALLOWED_LEAVE_SPACES, updateAllowLeave);
        return () => {
            SdkContextClass.instance.spaceStore.off(UPDATE_NOT_ALLOWED_LEAVE_SPACES, updateAllowLeave);
        };
    }, [space.roomId]);

    useTypedEventEmitter(space, RoomEvent.Name, () => {
        setSpaceName(space?.name);
    });

    useEffect(() => {
        setSpaceName(space?.name);
    }, [space]);

    useDispatcher(defaultDispatcher, (payload) => {
        switch (payload.action) {
            case Action.AfterLeaveRoom:
                if (payload.room_id === space.roomId) {
                    onFinished();
                }
                break;
        }
    });

    const tabs = useMemo(() => {
        return [
            new Tab(SpaceSettingsTab.General, _t("General"), null, <SpaceSettingsGeneralTab space={space} />),
            ...(displayMemberList
                ? [
                      new Tab(
                          SpaceSettingsTab.Roles,
                          _t("Roles & Permissions"),
                          null,
                          <RolesRoomSettingsTab roomId={space.roomId} />,
                      ),
                  ]
                : []),
            SettingsStore.getValue(UIFeature.SpaceAdvancedSettings)
                ? new Tab(
                      SpaceSettingsTab.Advanced,
                      _t("Advanced"),
                      null,
                      <AdvancedRoomSettingsTab roomId={space.roomId} closeSettingsFn={onFinished} />,
                  )
                : null,
        ].filter(Boolean) as NonEmptyArray<Tab>;
    }, [space, displayMemberList, onFinished]);

    const footer = useMemo(() => {
        let label, icon, iconClassName, onClick, canLeave;
        if (canDelete) {
            label = _t("Delete Space");
            icon = trashSvg;
            iconClassName = "mx_DeleteRoom_icon";
            onClick = () => deleteSpace(space);
            canLeave = true;
        } else {
            label = _t("Leave Space");
            icon = leaveSvg;
            iconClassName = "mx_LeaveRoom_icon";
            onClick = () => leaveSpace(space);
            canLeave = allowLeave;
        }

        return (
            canLeave && (
                <Button
                    type={ButtonType.Text}
                    size={ButtonSize.Small}
                    danger
                    onClick={onClick}
                    icon={icon}
                    iconClassName={iconClassName}
                >
                    {label}
                </Button>
            )
        );
    }, [space, canDelete]);

    return (
        <RoomSettingsBaseDialog onFinished={onFinished}>
            <TabbedView
                footer={footer}
                title={spaceName || _t("Unnamed Space")}
                tabs={tabs}
                defaultTabId={SpaceSettingsTab.General}
            />
        </RoomSettingsBaseDialog>
    );
};

export default memo(SpaceSettingsDialog);
