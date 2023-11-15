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
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { _t } from "../../../languageHandler";
import { IProps as IContextMenuProps } from "matrix-react-sdk/src/components/structures/ContextMenu";

interface IProps extends IContextMenuProps {
    showIcon?: boolean;
}

const SpaceAddTagContextMenu: React.FC<IProps> = ({ onFinished, showIcon = false }) => {
    const cli = useContext(MatrixClientContext);

    // 新增分组
    const onAddSpaceTag = async (): Promise<void> => {
        const tagId = `${new Date().getTime()}/${cli.getUserId()}/${cli.getDeviceId()}`;
        const num = Math.round(Math.random() * 100);

        // 添加前做去重处理
        const tags = [...SpaceStore.instance.spaceTags];
        const newTag = {
            tagId,
            tagName: `测试tag：${num}`,
        };
        const index = tags.findIndex((item) => item.tagId === tagId);
        if (index !== -1) {
            tags.splice(index, 1, newTag);
        } else {
            tags.push(newTag);
        }

        await SpaceStore.instance.sendSpaceTags(tags);
        alert(`成功添加分组 - 测试tag：${num}`);
        onFinished();
    };

    return (
        <IconizedContextMenuOption
            iconClassName={showIcon ? "mx_SpacePanel_iconAddGroup" : ""}
            label={_t("Create Group")}
            onClick={onAddSpaceTag}
        />
    );
};

export default SpaceAddTagContextMenu;
