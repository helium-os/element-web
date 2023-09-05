import {RoomMember, RoomMemberEvent} from "matrix-js-sdk/src/models/room-member";
import {removeDirectionOverrideChars, removeHiddenChars} from "matrix-js-sdk/src/utils";
import OrgStore from "../../matrix-react-sdk/src/stores/OrgStore";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {RoomState} from "matrix-js-sdk/src/models/room-state";


const _setMembershipEvent = RoomMember.prototype.setMembershipEvent;
RoomMember.prototype.setMembershipEvent = function(event: MatrixEvent, roomState?: RoomState): void {
    _setMembershipEvent.call(this, ...arguments);

    const oldName = this.name;
    const displayName = event.getDirectionalContent().displayname ?? "";
    this.name = calculateDisplayName(this.userId, displayName, this.disambiguate);
    if (oldName !== this.name) {
        this.updateModifiedTime();
        this.emit(RoomMemberEvent.Name, event, this, oldName);
    }
}

function calculateDisplayName(selfUserId: string, displayName: string | undefined, disambiguate: boolean): string {
    if (!displayName || displayName === selfUserId) return selfUserId;


    if (disambiguate) {
        const orgId = OrgStore.sharedInstance().getUserOrgId(selfUserId);
        const orgName = OrgStore.sharedInstance().getOrgNameById(orgId);
        return removeDirectionOverrideChars(displayName) + " (" + orgName + ")";
    }

    // First check if the displayname is something we consider truthy
    // after stripping it of zero width characters and padding spaces
    if (!removeHiddenChars(displayName)) return selfUserId;

    // We always strip the direction override characters (LRO and RLO).
    // These override the text direction for all subsequent characters
    // in the paragraph so if display names contained these, they'd
    // need to be wrapped in something to prevent this from leaking out
    // (which we can do in HTML but not text) or we'd need to add
    // control characters to the string to reset any overrides (eg.
    // adding PDF characters at the end). As far as we can see,
    // there should be no reason these would be necessary - rtl display
    // names should flip into the correct direction automatically based on
    // the characters, and you can still embed rtl in ltr or vice versa
    // with the embed chars or marker chars.
    return removeDirectionOverrideChars(displayName);
}
