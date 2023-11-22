/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React, { useRef, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import { chromeFileInputFix } from "matrix-react-sdk/src/utils/BrowserWorkarounds";

export interface AvatarProps {
    avatarUrl?: string; // 初始头像
    avatarDisabled?: boolean;
    setAvatar(avatar?: File): void;
}

const AvatarSetting: React.FC<AvatarProps> = ({ avatarUrl = "", avatarDisabled = false, setAvatar }) => {
    const avatarUploadRef = useRef<HTMLInputElement>();
    const [avatar, setAvatarDataUrl] = useState(avatarUrl); // avatar data url cache

    let avatarSection;
    if (avatarDisabled) {
        if (avatar) {
            avatarSection = <img className="mx_SpaceBasicSettings_avatar" src={avatar} alt="" />;
        } else {
            avatarSection = <div className="mx_SpaceBasicSettings_avatar" />;
        }
    } else {
        if (avatar) {
            avatarSection = (
                <React.Fragment>
                    <AccessibleButton
                        className="mx_SpaceBasicSettings_avatar"
                        onClick={() => avatarUploadRef.current?.click()}
                        element="img"
                        src={avatar}
                        alt=""
                    />
                </React.Fragment>
            );
        } else {
            avatarSection = (
                <React.Fragment>
                    <div className="mx_SpaceBasicSettings_avatar" onClick={() => avatarUploadRef.current?.click()} />
                </React.Fragment>
            );
        }
    }

    return (
        <div className="mx_SpaceBasicSettings_avatarContainer">
            {avatarSection}
            <input
                type="file"
                ref={avatarUploadRef}
                onClick={chromeFileInputFix}
                onChange={(e) => {
                    if (!e.target.files?.length) return;
                    const file = e.target.files[0];
                    setAvatar(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        setAvatarDataUrl(ev.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                }}
                accept="image/*"
            />
        </div>
    );
};

export default AvatarSetting;
