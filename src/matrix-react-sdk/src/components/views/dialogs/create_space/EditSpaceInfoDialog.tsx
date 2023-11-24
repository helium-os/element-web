import React, { memo, useState, useRef } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import { Visibility } from "matrix-js-sdk/src/@types/partials";
import {
    createSpace,
    SpaceCreateForm,
    spaceNameValidator,
} from "matrix-react-sdk/src/components/views/spaces/SpaceCreateMenu";
import Field from "matrix-react-sdk/src/components/views/elements/Field";
import { IFieldState, IValidationResult } from "matrix-react-sdk/src/components/views/elements/Validation";

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
    const [nameValidate, setNameValidate] = useState<boolean>(false);

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

    const onNameValidate = async (fieldState: IFieldState): Promise<IValidationResult> => {
        const result = await spaceNameValidator({
            ...fieldState,
            allowEmpty: false,
        });
        setNameValidate(result.valid);
        return result;
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Create")}
            primaryDisabled={!nameValidate || busy}
            primaryLoading={busy}
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
                onNameValidate={onNameValidate}
                showAliasField={false}
            />
        </BaseDialog>
    );
};

export default memo(ChooseSpaceTypeDialog);
