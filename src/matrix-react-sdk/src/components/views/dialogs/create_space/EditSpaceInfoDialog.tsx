import React, { memo, useState, useRef } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import { Visibility } from "matrix-js-sdk/src/@types/partials";
import { createSpace, SpaceCreateForm } from "matrix-react-sdk/src/components/views/spaces/SpaceCreateMenu";
import Field from "matrix-react-sdk/src/components/views/elements/Field";

interface IProps {
    spaceType: Visibility;
    stepIndex: number;
    onStepChange: (step: number) => void;
    onSpaceIdChange: (spaceId: string) => void;
    onFinished: () => void;
    [key: string]: any;
}
const ChooseSpaceTypeDialog: React.FC<IProps> = ({
    spaceType,
    stepIndex,
    onStepChange,
    onSpaceIdChange,
    onFinished,
}) => {
    const [busy, setBusy] = useState<boolean>(false);

    const [avatar, setAvatar] = useState<File | undefined>(undefined);

    const spaceNameField = useRef<Field>();
    const [name, setName] = useState("");

    const onOk = async () => {
        if (busy) return;

        setBusy(true);
        try {
            const spaceId = await onCreateSpace();
            if (!spaceId) {
                throw new Error("创建社区失败");
            }
            onSpaceIdChange(spaceId);
            onNext();
        } catch (error) {
        } finally {
            setBusy(false);
        }
    };
    const onClose = () => {
        onFinished?.();
    };

    const onNext = () => {
        onStepChange(stepIndex + 1);
    };

    const onBack = () => {
        onStepChange(stepIndex - 1);
    };

    const onCreateSpace = async (): Promise<string | void> => {
        // require & validate the space name field
        if (spaceNameField.current && !(await spaceNameField.current.validate({ allowEmpty: false }))) {
            spaceNameField.current.focus();
            spaceNameField.current.validate({ allowEmpty: false, focused: true });
            return;
        }

        return createSpace(name, spaceType === Visibility.Public, "", "", avatar);
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Create")}
            onPrimaryButtonClick={onOk}
            cancelButton={_t("Back")}
            onCancel={onBack}
        />
    );

    return (
        <BaseDialog
            className="mx_EditSpaceInfoDialog"
            onFinished={onClose}
            title={"自定义您的社区"}
            description={_t("Add some details to help people recognise it.")}
            footer={footer}
        >
            <SpaceCreateForm
                busy={busy}
                setAvatar={setAvatar}
                name={name}
                nameFieldRef={spaceNameField}
                setName={setName}
                showAliasField={false}
            />
        </BaseDialog>
    );
};

export default memo(ChooseSpaceTypeDialog);
