import React, { memo, useState, useMemo, useCallback } from "react";
import ChooseSpaceTypeDialog from "./ChooseSpaceTypeDialog";
import EditSpaceInfoDialog from "./EditSpaceInfoDialog";
import AddChannelDialog from "./AddChannelDialog";
import InviteToSpaceDialog from "./InviteToSpaceDialog";
import { Visibility } from "matrix-js-sdk/src/@types/partials";
interface IProps {
    onFinished: () => void;
}
const CreateSpaceDialog: React.FC<IProps> = ({ onFinished }) => {
    const [curStep, setCurStep] = useState<number>(1);
    const [spaceType, setSpaceType] = useState<Visibility>();
    const [spaceId, setSpaceId] = useState<string>(); // 新创建的社区id

    const onStepChange = useCallback((step: number) => {
        setCurStep(Math.max(step, 1));
    }, []);

    const onSpaceTypeChange = useCallback((spaceType) => {
        setSpaceType(spaceType);
    }, []);

    const onSpaceIdChange = useCallback((spaceId) => {
        setSpaceId(spaceId);
    }, []);

    const stepComponents = useMemo(
        () => [
            {
                Component: ChooseSpaceTypeDialog,
                props: {
                    onSpaceTypeChange,
                },
            },
            {
                Component: EditSpaceInfoDialog,
                props: {
                    spaceType,
                    onSpaceIdChange,
                },
            },
            {
                Component: AddChannelDialog,
                props: {
                    spaceId,
                },
            },
            {
                Component: InviteToSpaceDialog,
                props: { spaceId },
            },
        ],
        [spaceType, onSpaceTypeChange, onSpaceIdChange, spaceId],
    );

    return (
        <>
            {stepComponents.map(({ Component, props }, index) => (
                <div key={index} style={{ display: index + 1 === curStep ? "block" : "none" }}>
                    <Component stepIndex={index + 1} onStepChange={onStepChange} onFinished={onFinished} {...props} />
                </div>
            ))}
        </>
    );
};

export default memo(CreateSpaceDialog);
