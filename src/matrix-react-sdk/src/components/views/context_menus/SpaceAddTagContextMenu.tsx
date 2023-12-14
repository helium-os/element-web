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

import React, { useContext } from "react";
import { IconizedContextMenuOption } from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";
import { ContextMenuProps } from "matrix-react-sdk/src/components/structures/ContextMenu";
import Modal from "matrix-react-sdk/src/Modal";
import GroupNameDialog, { DialogType } from "matrix-react-sdk/src/components/views/dialogs/group/GroupNameDialog";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import MatrixClientContext from "matrix-react-sdk/src/contexts/MatrixClientContext";

interface IProps extends ContextMenuProps {
    showIcon?: boolean;
}

const SpaceAddTagContextMenu: React.FC<IProps> = ({ showIcon = false }) => {
    const cli = useContext(MatrixClientContext);
    const userId = cli.getUserId()!;
    const activeSpaceRoom = SpaceStore.instance.activeSpaceRoom;
    const hasTagPermission = activeSpaceRoom?.canOperateTag(userId);

    // 新增分组
    const onAddSpaceTag = async (): Promise<void> => {
        Modal.createDialog(GroupNameDialog, {
            type: DialogType.Create,
        });
    };

    return (
        <>
            {hasTagPermission && (
                <IconizedContextMenuOption
                    iconClassName={showIcon ? "mx_SpacePanel_iconAddGroup" : ""}
                    label={_t("Create Group")}
                    onClick={onAddSpaceTag}
                />
            )}
        </>
    );
};

export default SpaceAddTagContextMenu;
