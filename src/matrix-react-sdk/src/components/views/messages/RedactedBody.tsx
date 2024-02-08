/*
Copyright 2020 - 2021 The Matrix.org Foundation C.I.C.

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
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";

import { _t } from "../../../languageHandler";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { IBodyProps } from "./IBodyProps";
interface IProps {
    mxEvent: MatrixEvent;
    hasReply?: boolean;
}

const RedactedBody = React.forwardRef<any, IProps | IBodyProps>(({ mxEvent, hasReply = false }, ref) => {
    const cli: MatrixClient = useContext(MatrixClientContext);

    // 是否有消息列回复
    const thread = mxEvent.getThread();
    const hasThread = thread && thread.id === mxEvent.getId();

    let text = _t("Message deleted"); // "消息被撤回"
    const unsigned = mxEvent.getUnsigned();
    const redactedBecauseUserId = unsigned && unsigned.redacted_because && unsigned.redacted_because.sender;
    // 当前消息没有普通回复||消息列回复的消息被撤回后展示"xxx 撤回了一条消息"
    if (!hasThread && !hasReply && redactedBecauseUserId) {
        const room = cli.getRoom(mxEvent.getRoomId());
        const sender = room && room.getMember(redactedBecauseUserId);
        text = _t("Message deleted by %(name)s", {
            name: () => <label>{sender ? sender.name : redactedBecauseUserId}</label>,
        });
    }

    return (
        <span className="mx_RedactedBody mx_TextualEvent" ref={ref}>
            {text}
        </span>
    );
});

export default RedactedBody;
