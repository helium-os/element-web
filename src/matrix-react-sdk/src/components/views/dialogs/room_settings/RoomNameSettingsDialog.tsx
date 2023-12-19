import React, { memo, useState, useEffect } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { getRoomTypeLabel } from "../../../../../../vector/rewrite-js-sdk/room";
import { IFieldState, IValidationResult } from "matrix-react-sdk/src/components/views/elements/Validation";
import { spaceNameValidator } from "matrix-react-sdk/src/components/views/spaces/SpaceCreateMenu";

interface IProps {
    roomId: string;
    roomName?: string;
    canSetName?: boolean;
    onFinished: () => void;
}
const RoomNameSettingsDialog: React.FC<IProps> = ({ roomId, roomName = "", canSetName = false, onFinished }) => {
    const client = MatrixClientPeg.get();

    const [roomTypeLabel, setRoomTypeLabel] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>(roomName);
    const [saveEnable, setSaveEnable] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);

    useEffect(() => {
        setRoomTypeLabel(getRoomTypeLabel(roomId));
    }, [roomId]);

    useEffect(() => {
        setSaveEnable(canSetName && !busy && !!displayName.trim() && displayName.trim() !== roomName.trim());
    }, [displayName, roomName, canSetName, busy]);
    const onDisplayNameChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setDisplayName(e.target.value);
    };

    const onSaveProfile = async (e: React.FormEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        if (!saveEnable) return;

        setBusy(true);
        try {
            await client.setRoomName(roomId, displayName.trim());
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
            title={_t("Edit Room Name", {
                roomType: roomTypeLabel,
            })}
            footer={footer}
        >
            <Field
                label={_t("Room Name", {
                    roomType: roomTypeLabel,
                })}
                placeholder={_t("Please enter a name for the room", {
                    roomType: roomTypeLabel,
                })}
                usePlaceholderAsHint={true}
                autoFocus={false}
                wordLimit={80}
                value={displayName}
                onChange={onDisplayNameChanged}
                disabled={!canSetName || busy}
                autoComplete="off"
                validateOnFocus={false}
            />
        </BaseDialog>
    );
};

export default memo(RoomNameSettingsDialog);
