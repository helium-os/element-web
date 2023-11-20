import React, { memo, useState, useEffect, useMemo, useCallback } from "react";

interface IProps {
    total: number; // 总步骤数
    step: number; // 当前处于第几个步骤
    canSkip?: boolean; // 是否可以跳过
    onSkip?: () => void;
}
const StepTips: React.FC<IProps> = ({ total, step, canSkip = false, onSkip }) => {
    return (
        <div className="mx_StepWrap">
            <p>
                第{step}步，共{total}步
            </p>
            {canSkip && <div onClick={() => onSkip?.()}>跳过</div>}
        </div>
    );
};

export default memo(StepTips);
