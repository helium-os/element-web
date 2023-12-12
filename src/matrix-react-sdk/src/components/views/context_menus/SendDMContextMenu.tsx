import React, { memo } from "react";
import { UserInfoHeader } from "matrix-react-sdk/src/components/views/right_panel/UserInfo";
import { Room } from "matrix-js-sdk/src/models/room";
import Button from "matrix-react-sdk/src/components/views/button/Button";
import { startDmOnFirstMessage } from "matrix-react-sdk/src/utils/direct-messages";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import ContextMenu, { ChevronFace, ContextMenuProps } from "matrix-react-sdk/src/components/structures/ContextMenu";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";

interface IProps extends ContextMenuProps {
    room: Room;
    member: RoomMember;
}
const SendDMContextMenu: React.FC<IProps> = ({ room, member, ...contextMenuProps }) => {
    const client = MatrixClientPeg.get();
    const isMe = member.userId === client.getUserId();
    const onSendDM = () => {
        const cli = MatrixClientPeg.get();
        startDmOnFirstMessage(cli, [member]);
    };
    return (
        <ContextMenu chevronFace={ChevronFace.None} menuWidth={200} {...contextMenuProps}>
            <div className="mx_SendDMContextMenu">
                <UserInfoHeader member={member} room={room} roomId={room.roomId} avatarSize={56} />
                {!isMe && (
                    <>
                        <hr />
                        <div className="mx_SendDMContextMenu_btnBox">
                            <Button block onClick={onSendDM}>
                                发送私信
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </ContextMenu>
    );
};

export default memo(SendDMContextMenu);
