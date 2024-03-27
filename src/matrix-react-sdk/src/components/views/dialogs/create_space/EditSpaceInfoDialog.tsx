import React, { memo, useState, useMemo, useRef } from "react";
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
import UserStore from "matrix-react-sdk/src/stores/UserStore";
import { defaultOrgId, getOrgId } from "matrix-react-sdk/src/utils/env";

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

    const spaceAliasField = useRef<Field>();
    const [alias, setAlias] = useState("");

    // heliumos组织的admin用户创建社区时需要展示alias配置项
    const showAliasField = useMemo(() => UserStore.instance().canCreateSpace && getOrgId() === defaultOrgId, []);

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

        return createSpace(name, spaceType === Visibility.Public, alias, "", avatar);
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
            primaryButtonProps={{
                disabled: !nameValidate || busy,
                loading: busy,
            }}
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
                showAliasField={showAliasField}
                aliasFieldRef={spaceAliasField}
                alias={alias}
                setAlias={setAlias}
            />
        </BaseDialog>
    );
};

export default memo(ChooseSpaceTypeDialog);
