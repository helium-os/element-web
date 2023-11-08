/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

export enum DefaultTagID {
    Invite = "im.vector.fake.invite", // 邀请
    Untagged = "im.vector.fake.recent", // legacy: used to just be 'recent rooms' but now it's all untagged rooms
    Archived = "im.vector.fake.archived", // 历史房间（已离开的房间）
    LowPriority = "m.lowpriority", // 低优先级
    Favourite = "m.favourite", // 收藏夹
    DM = "im.vector.fake.direct", // 私聊
    ServerNotice = "m.server_notice", // 系统警告
    Suggested = "im.vector.fake.suggested", // 建议的频道
    SavedItems = "im.vector.fake.saved_items", // 已保存
}

export const OrderedDefaultTagIDs = [
    DefaultTagID.Invite,
    DefaultTagID.Favourite,
    DefaultTagID.SavedItems,
    DefaultTagID.DM,
    DefaultTagID.Untagged,
    DefaultTagID.LowPriority,
    DefaultTagID.ServerNotice,
    DefaultTagID.Suggested,
    DefaultTagID.Archived,
];

export type TagID = string | DefaultTagID;

export interface Tag {
    tagId: TagID;
    tagName: string;
    order: number;
}

export type TagMap = {
    [tagId in TagID]: Omit<Tag, "tagId">;
};

export function transformTagsObjToArr(tagsObj: TagMap) {
    const tagsArr: Tag[] = [];
    for (const [key, value] of Object.entries(tagsObj)) {
        tagsArr.push({
            tagId: key,
            ...value,
        });
    }
    return tagsArr;
}

export const tagOrderCompareFn = function (a: Tag, b: Tag) {
    return a.order - b.order;
};

export enum RoomUpdateCause {
    Timeline = "TIMELINE",
    PossibleTagChange = "POSSIBLE_TAG_CHANGE",
    ReadReceipt = "READ_RECEIPT",
    NewRoom = "NEW_ROOM",
    RoomRemoved = "ROOM_REMOVED",
}
