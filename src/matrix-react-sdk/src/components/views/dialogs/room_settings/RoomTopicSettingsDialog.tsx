import React, { memo, useState, useEffect } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

interface IProps {
    roomId: string;
    topic?: string;
    canSetTopic?: boolean;
    onFinished: () => void;
}
const RoomTopicSettingsDialog: React.FC<IProps> = ({ roomId, topic = "", canSetTopic = false, onFinished }) => {
    const client = MatrixClientPeg.get();

    const [newTopic, setNewTopic] = useState<string>(topic);
    const [saveEnable, setSaveEnable] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);

    useEffect(() => {
        setSaveEnable(canSetTopic && !busy && !!newTopic.trim() && newTopic.trim() !== topic.trim());
    }, [newTopic, topic, canSetTopic, busy]);
    const onTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setNewTopic(e.target.value);
    };

    const onSaveProfile = async (e: React.FormEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        if (!saveEnable) return;

        setBusy(true);
        try {
            await client.setRoomTopic(roomId, newTopic.trim());
            onFinished();
        } catch (error) {
        } finally {
            setBusy(false);
        }
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Save")}
            primaryButtonProps={{
                loading: busy,
                disabled: !saveEnable,
            }}
            onPrimaryButtonClick={onSaveProfile}
            onCancel={onFinished}
        />
    );

    return (
        <BaseDialog
            className="mx_EditSpaceInfoDialog"
            onFinished={onFinished}
            title={_t("Change description")}
            footer={footer}
        >
            <Field
                type="text"
                element="textarea"
                label={_t("Description")}
                usePlaceholderAsHint={true}
                placeholder={"请输入一些描述"}
                onChange={onTopicChange}
                value={newTopic}
                wordLimit={1000}
            />
        </BaseDialog>
    );
};

export default memo(RoomTopicSettingsDialog);
