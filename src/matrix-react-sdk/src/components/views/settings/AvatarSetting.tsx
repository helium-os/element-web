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

import React, { useRef, useState, useEffect, memo } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import { chromeFileInputFix } from "matrix-react-sdk/src/utils/BrowserWorkarounds";
import RoomAvatar from "matrix-react-sdk/src/components/views/avatars/RoomAvatar";
import { Room } from "matrix-js-sdk/src/models/room";
import { getRequestImageSrc } from "matrix-react-sdk/src/components/views/avatars/BaseAvatar";

export enum OperateType {
    Create,
    Edit,
}

export interface AvatarProps {
    type?: OperateType;
    room?: Room;
    size?: number;
    avatarUrl?: string | null;
    avatarDisabled?: boolean;
    setAvatar?(avatar?: File): void;
}

const AvatarSetting: React.FC<AvatarProps> = ({
    type = OperateType.Create,
    room,
    avatarUrl = "",
    size = 100,
    avatarDisabled = false,
    setAvatar,
}) => {
    const avatarUploadRef = useRef<HTMLInputElement>();
    const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

    useEffect(() => {
        setAvatarDataUrl(avatarUrl);
    }, [avatarUrl]);

    let avatarSection;

    const getNoDateUrlAvatar = () => {
        return (
            <div
                className={avatarDisabled ? "mx_AvatarSetting_disabled" : ""}
                onClick={() => !avatarDisabled && avatarUploadRef.current?.click()}
            >
                {type === OperateType.Edit ? (
                    <RoomAvatar width={size} height={size} room={room} />
                ) : (
                    <div className="mx_AvatarSetting_avatar" />
                )}
            </div>
        );
    };

    const finalAvatarUrl = getRequestImageSrc(avatarDataUrl);

    if (avatarDisabled) {
        avatarSection = avatarDataUrl ? (
            <img className="mx_AvatarSetting_avatar mx_AvatarSetting_disabled" src={finalAvatarUrl} alt="" />
        ) : (
            getNoDateUrlAvatar()
        );
    } else {
        avatarSection = (
            <>
                {avatarDataUrl ? (
                    <AccessibleButton
                        className="mx_AvatarSetting_avatar"
                        onClick={() => avatarUploadRef.current?.click()}
                        element="img"
                        src={finalAvatarUrl}
                        alt=""
                    />
                ) : (
                    getNoDateUrlAvatar()
                )}
                <div className="mx_AvatarSetting_mask" onClick={() => avatarUploadRef.current?.click()}>
                    {type === OperateType.Edit && <label>编辑</label>}
                </div>
            </>
        );
    }

    const onFileChange = (e) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setAvatar(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAvatarDataUrl(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="mx_AvatarSetting_container" style={{ width: size, height: size }}>
            {avatarSection}
            {!avatarDisabled && (
                <input
                    type="file"
                    ref={avatarUploadRef}
                    onClick={chromeFileInputFix}
                    onChange={onFileChange}
                    accept="image/*"
                />
            )}
        </div>
    );
};

export default memo(AvatarSetting);
