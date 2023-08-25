import {IContainsDisplayNameCondition} from "matrix-js-sdk/src/@types/PushRules";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {escapeRegExp} from "matrix-js-sdk/src/utils";
import {PushProcessor} from "matrix-js-sdk/src/pushprocessor";

import {getResourceInfoFromUrl} from "../../matrix-react-sdk/src/hooks/usePermalink";
import AllMember from "../../matrix-react-sdk/src/utils/AllMember";
import {beMentioned} from "../../matrix-react-sdk/src/components/views/elements/Pill";

PushProcessor.prototype.eventFulfillsDisplayNameCondition = function(cond: IContainsDisplayNameCondition, ev: MatrixEvent): boolean {
    let content = ev.getContent();
    console.log('content', content, 'ev', ev);
    if (ev.isEncrypted() && ev.getClearContent()) {
        content = ev.getClearContent()!;
    }

    const formatBody = content.formatted_body || '';

    const url = /href="([^"]+)">/.exec( formatBody)?.[1];

    if (!content || !content.body || typeof content.body != "string" || !formatBody || !url) {
        return false;
    }

    const room = this.client.getRoom(ev.getRoomId());
    const currentUserId = this.client.credentials.userId!;
    const member = room?.currentState?.getMember(currentUserId);
    if (!member) {
        return false;
    }


    /**
     * 用name判断会有bug；
     * 比如在用户改名字或者@All后成员语言设置不一时，@某个用户或者@All后消息 & 背景不会高亮， 左侧未读提示不会标红
     * 比如输入包含某个用户名字的文字，或者All/所有人，消息 & 背景也会高亮，左侧未读消息会标红
     */
    // N.B. we can't use \b as it chokes on unicode. however \W seems to be okay
    // as shorthand for [^0-9A-Za-z_].
    // const displayName = member.name;
    // const pat = new RegExp(`(^|\\W)(${escapeRegExp(displayName)}|${escapeRegExp(AllMember.instance().getAllMemberName(room.roomId))})(\\W|$)`, "i");
    // return content.body.search(pat) > -1;


    const senderId = ev.getSender();
    const { resourceId } = getResourceInfoFromUrl(url);
    if (!resourceId) {
        return false;
    }
    return beMentioned(room.roomId, currentUserId, resourceId, senderId);
}


