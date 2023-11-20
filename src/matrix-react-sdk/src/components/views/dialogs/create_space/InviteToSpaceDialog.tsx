import React, { memo, useCallback } from "react";
import StepTips from "./StepTips";
import InviteDialog from "matrix-react-sdk/src/components/views/dialogs/InviteDialog";
interface IProps {}
const InviteToSpaceDialog: React.FC<any> = ({ totalStep, stepIndex, onStepChange, spaceId }) => {
    const onOk = async () => {};

    const onCancel = useCallback(() => {}, []);

    const onFinished = () => {};

    const onBack = () => {
        onStepChange(stepIndex - 1);
    };

    const footerAdditive = <StepTips total={totalStep} step={stepIndex} canSkip={true} />;

    return <InviteDialog footerAdditive={footerAdditive} onFinished={onFinished} />;
};

export default memo(InviteToSpaceDialog);
