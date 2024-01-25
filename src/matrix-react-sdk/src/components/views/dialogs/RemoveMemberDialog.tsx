import React, { memo, useState } from "react";
import BaseDialog from "./BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import Modal from "matrix-react-sdk/src/Modal";
import ErrorDialog from "matrix-react-sdk/src/components/views/dialogs/ErrorDialog";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";

interface IProps {
    roomId: string;
    userId: string;
    onFinished: () => void;
}
const RemoveMemberDialog: React.FC<IProps> = ({ roomId, userId, onFinished }) => {
    const [busy, setBusy] = useState<boolean>(false);
    const client = MatrixClientPeg.get();
    const room = client.getRoom(roomId);
    const onRemove = async (): Promise<void> => {
        if (busy) return;

        setBusy(true);
        try {
            await client.batchLeave(roomId, userId);
        } catch (error) {
            Modal.createDialog(ErrorDialog, {
                title: _t("Failed to remove user"),
                description: error && error.message ? error.message : "Operation failed",
            });
        } finally {
            onFinished();
            setBusy(false);
        }
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Remove")}
            primaryButtonProps={{
                loading: busy,
                disabled: busy,
                danger: true,
            }}
            onPrimaryButtonClick={onRemove}
            onCancel={onFinished}
        />
    );

    return (
        <BaseDialog
            className="mx_RemoveUserDialog"
            fixedWidth={false}
            title={_t("Remove users")}
            footer={footer}
            onFinished={onFinished}
        >
            <p>
                你确定将该成员从
                {room.isSpaceRoom() ? _t("Space") : SpaceStore.instance.isHomeSpace ? _t("Room") : _t("Channel")}
                中移除吗？
            </p>
        </BaseDialog>
    );
};

export default memo(RemoveMemberDialog);
