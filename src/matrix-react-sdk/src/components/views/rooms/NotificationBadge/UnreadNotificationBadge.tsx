/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { Room, UnreadNotificationState } from "matrix-js-sdk/src/models/room";
import React, { useEffect } from "react";

import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import { StatelessNotificationBadge } from "./StatelessNotificationBadge";

interface Props {
    room?: Room;
    threadId?: string;
    onStateChange?: (state: UnreadNotificationState) => void;
}

export function UnreadNotificationBadge({ room, threadId, onStateChange }: Props): JSX.Element {
    const { symbol, count, color } = useUnreadNotifications(room, threadId);

    useEffect(() => {
        onStateChange?.({
            symbol,
            count,
            color,
        });
    }, [onStateChange, symbol, count, color]);

    return <StatelessNotificationBadge symbol={symbol} count={count} color={color} />;
}
