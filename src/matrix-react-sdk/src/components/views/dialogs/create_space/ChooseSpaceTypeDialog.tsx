import React, { memo, useState } from "react";
import BaseDialog from "../BaseDialog";
import { _t } from "matrix-react-sdk/src/languageHandler";
import DialogButtons from "matrix-react-sdk/src/components/views/elements/DialogButtons";
import { Visibility } from "matrix-js-sdk/src/@types/partials";
import { SpaceCreateMenuType } from "matrix-react-sdk/src/components/views/spaces/SpaceCreateMenu";

interface IProps {
    stepIndex: number;
    onStepChange: (step: number) => void;
    onSpaceTypeChange: (spaceType: string) => void;
    onFinished: () => void;
    [key: string]: any;
}
const ChooseSpaceTypeDialog: React.FC<IProps> = ({ stepIndex, onStepChange, onSpaceTypeChange, onFinished }) => {
    const [selectedSpaceType, setSelectedSpaceType] = useState<Visibility>();

    const spaceTypeMaps = [
        {
            key: Visibility.Public,
            title: _t("Public"),
            description: _t("Open space for anyone, best for communities"),
            className: "mx_SpaceTypeItem_public",
        },
        {
            key: Visibility.Private,
            title: _t("Private"),
            description: _t("Invite only, best for yourself or teams"),
            className: "mx_SpaceTypeItem_private",
        },
    ];
    const onOk = () => {
        if (!selectedSpaceType) return;

        onSpaceTypeChange(selectedSpaceType);
        onNext();
    };

    const onClose = () => {
        onFinished?.();
    };

    const onNext = () => {
        onStepChange(stepIndex + 1);
    };

    const footer = (
        <DialogButtons
            primaryButton={_t("Next")}
            primaryDisabled={!selectedSpaceType}
            onPrimaryButtonClick={onOk}
            onCancel={onClose}
        />
    );

    return (
        <BaseDialog
            className="mx_ChooseSpaceTypeDialog"
            onFinished={onClose}
            title={_t("Create a space")}
            description={_t("Open space for anyone, best for communities")}
            footer={footer}
        >
            <div className="mx_SpaceCreateMenu_wrapper">
                {spaceTypeMaps.map(({ key, title, description, className }) => (
                    <SpaceCreateMenuType
                        key={key}
                        title={title}
                        description={description}
                        className={`${className} ${selectedSpaceType === key ? "active" : ""}`}
                        onClick={() => setSelectedSpaceType(key)}
                    />
                ))}
            </div>
        </BaseDialog>
    );
};

export default memo(ChooseSpaceTypeDialog);
