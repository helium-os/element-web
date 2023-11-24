import React, { memo, useState, useEffect } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import SpaceStore from "matrix-react-sdk/src/stores/spaces/SpaceStore";
import { ButtonType } from "matrix-react-sdk/src/components/views/button/Button";
interface IProps {
    tagId: string; // 分组id
    onFinished: () => void;
}
const DeleteGroupConfirmDialog: React.FC<IProps> = ({ tagId, onFinished }) => {
    const [busy, setBusy] = useState<boolean>(false);

    const [name, setName] = useState<string>("");

    // 初始化分组名称
    useEffect(() => {
        if (!tagId) return;

        // 回显当前分组名称
        const tags = SpaceStore.instance.spaceTags;
        const match = tags.find((item) => item.tagId === tagId);
        setName(match?.tagName || "");
    }, [tagId]);

    const onOk = async () => {
        if (busy) return;

        setBusy(true);
        try {
            await onDeleteGroup();
            onClose();
        } catch (error) {
        } finally {
            setBusy(false);
        }
    };
    const onClose = () => {
        onFinished();
    };

    const onDeleteGroup = async () => {
        const tags = [...SpaceStore.instance.spaceTags];
        const index = tags.findIndex((item) => item.tagId === tagId);
        if (index !== -1) {
            tags.splice(index, 1);

            await SpaceStore.instance.sendSpaceTags(tags);
        }
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Delete")}
            primaryButtonType={ButtonType.Danger}
            primaryLoading={busy}
            primaryDisabled={busy}
            onPrimaryButtonClick={onOk}
            cancelButton={_t("Cancel")}
            onCancel={onClose}
        />
    );

    return (
        <BaseDialog
            className="mx_DeleteGroupConfirmDialog"
            onFinished={onClose}
            title={_t("Delete Group")}
            footer={footer}
        >
            <p className="mx_DeleteGroupConfirm_wrap">
                你确定要删除<span className="mx_DeleteConfirm_groupName">{name}</span>吗？
            </p>
        </BaseDialog>
    );
};

export default memo(DeleteGroupConfirmDialog);
