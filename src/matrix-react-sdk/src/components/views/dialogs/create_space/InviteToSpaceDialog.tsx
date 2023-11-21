import React, { memo } from "react";
import InviteDialog from "matrix-react-sdk/src/components/views/dialogs/InviteDialog";
import { InviteKind } from "matrix-react-sdk/src/components/views/dialogs/InviteDialogTypes";
import { _t } from "matrix-react-sdk/src/languageHandler";
interface IProps {
    spaceId: string;
    onFinished: () => void;
    [key: string]: any;
}
const InviteToSpaceDialog: React.FC<IProps> = ({ spaceId, onFinished }) => {
    return (
        <InviteDialog
            kind={InviteKind.Invite}
            roomId={spaceId}
            onFinished={onFinished}
            dialogButtonsProps={{
                cancelButton: _t("Skip"),
                onCancel: onFinished,
            }}
        />
    );
};

export default memo(InviteToSpaceDialog);
