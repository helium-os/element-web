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

import React, { ChangeEvent } from "react";

import { _t } from "../../../languageHandler";
import Field from "../elements/Field";
import AvatarSetting, { AvatarProps } from "matrix-react-sdk/src/components/views/settings/AvatarSetting";

type IProps = AvatarProps & {
    name: string;
    nameDisabled?: boolean;
    topic: string;
    topicDisabled?: boolean;
    setName(name: string): void;
    setTopic(topic: string): void;
};

const SpaceBasicSettings: React.FC<IProps> = ({
    avatarUrl,
    avatarDisabled = false,
    setAvatar,
    name = "",
    nameDisabled = false,
    setName,
    topic = "",
    topicDisabled = false,
    setTopic,
}) => {
    return (
        <div className="mx_SpaceBasicSettings">
            <AvatarSetting avatarUrl={avatarUrl} avatarDisabled={avatarDisabled} setAvatar={setAvatar} />

            <Field
                name="spaceName"
                label={_t("Name")}
                autoFocus={true}
                value={name}
                onChange={(ev: ChangeEvent<HTMLInputElement>) => setName(ev.target.value)}
                disabled={nameDisabled}
            />

            <Field
                name="spaceTopic"
                element="textarea"
                label={_t("Description")}
                value={topic}
                onChange={(ev: ChangeEvent<HTMLTextAreaElement>) => setTopic(ev.target.value)}
                rows={3}
                disabled={topicDisabled}
            />
        </div>
    );
};

export default SpaceBasicSettings;
