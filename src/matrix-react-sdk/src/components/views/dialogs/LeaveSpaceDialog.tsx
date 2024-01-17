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

import { _t } from "../../../languageHandler";
import DialogButtons from "../elements/DialogButtons";
import BaseDialog from "../dialogs/BaseDialog";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { filterBoolean } from "../../../utils/arrays";

interface IProps {
    space: Room;
    onFinished(leave: boolean, rooms?: Room[]): void;
}

const LeaveSpaceDialog: React.FC<IProps> = ({ space, onFinished }) => {
    const spaceChildren = useMemo(() => {
        const roomSet = new Set(SpaceStore.instance.getSpaceFilteredRoomIds(space.roomId));
        SpaceStore.instance.traverseSpace(
            space.roomId,
            (spaceId) => {
                if (space.roomId === spaceId) return; // skip the root node
                roomSet.add(spaceId);
            },
            false,
        );
        return filterBoolean(Array.from(roomSet).map((roomId) => space.client.getRoom(roomId)));
    }, [space]);

    const footer = (
        <DialogButtons
            primaryButton={_t("Leave space")}
            primaryButtonProps={{
                danger: true,
            }}
            onPrimaryButtonClick={() => onFinished(true, spaceChildren)}
            hasCancel={true}
            onCancel={() => onFinished(false)}
        />
    );

    return (
        <BaseDialog
            title={_t("Leave Space")}
            className="mx_LeaveSpaceDialog"
            footer={footer}
            onFinished={() => onFinished(false)}
            fixedWidth={false}
        >
            {_t("Are you sure you want to leave the room?", {
                actionType: _t("Leave"),
                roomType: _t("Space"),
                roomName: space.name,
            })}
        </BaseDialog>
    );
};

export default LeaveSpaceDialog;
