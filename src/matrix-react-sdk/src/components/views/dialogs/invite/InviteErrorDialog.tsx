import React from "react";
import { _t } from "matrix-react-sdk/src/languageHandler";
import BaseDialog from "matrix-react-sdk/src/components/views/dialogs/BaseDialog";
import { Member } from "matrix-react-sdk/src/utils/direct-messages";
import { User } from "matrix-js-sdk/src/models/user";
import OrgStore from "matrix-react-sdk/src/stores/OrgStore";
import BaseAvatar from "matrix-react-sdk/src/components/views/avatars/BaseAvatar";
import { getHttpUrlFromMxc } from "matrix-react-sdk/src/customisations/Media";
import MultiInviter from "matrix-react-sdk/src/utils/MultiInviter";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

interface IProps {
    room: Room;
    failedUsers: string[];
    inviter: MultiInviter;
    userMap?: Map<string, Member>;
    onFinished: () => void;
}

const InviteErrorDialog: React.FC<IProps> = ({ room, failedUsers, inviter, userMap, onFinished }) => {
    const cli = MatrixClientPeg.get();

    return (
        <BaseDialog className="mx_InviteResultDialog" onFinished={onFinished}>
            <div className="mx_InviteDialog_result_wrap">
                <div className="mx_InviteResultIcon mx_InviteErrorIcon"></div>
                <h3>{_t("Some invites couldn't be sent")}</h3>
                <h4>
                    {_t(
                        "We sent the others, but the below people couldn't be invited to <RoomName/>",
                        {},
                        {
                            RoomName: () => <span className="mx_InviteDialog_roomName">{room.name}</span>,
                        },
                    )}
                </h4>
            </div>
            <div className="mx_InviteDialog_errorList">
                {failedUsers.map((addr) => {
                    const user = userMap?.get(addr) || cli.getUser(addr);
                    const name = (user as Member).name || (user as User).rawDisplayName;
                    const avatarUrl = (user as Member).getMxcAvatarUrl?.() || (user as User).avatarUrl;

                    const orgInstance = OrgStore.sharedInstance();
                    const orgId = orgInstance.getUserOrgId(user?.userId);
                    const orgName = orgInstance.getOrgNameById(orgId);
                    return (
                        <div key={addr} className="mx_Field_DropdownMenuItem mx_InviteDialog_tile--inviterError">
                            <div className="mx_InviteDialog_tile_avatarStack">
                                <BaseAvatar
                                    url={getHttpUrlFromMxc(avatarUrl, 36)}
                                    name={name!}
                                    idName={user?.userId}
                                    width={36}
                                    height={36}
                                />
                            </div>
                            <div className="mx_InviteDialog_tile_nameStack">
                                <span className="mx_InviteDialog_tile_nameStack_name">{name}</span>
                                <span className="mx_InviteDialog_tile_nameStack_userId">{orgName}</span>
                            </div>
                            <div className="mx_InviteDialog_tile--inviterError_errorText">
                                {inviter.getErrorText(addr)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </BaseDialog>
    );
};

export default InviteErrorDialog;
