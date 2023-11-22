import React from "react";
import BaseDialog from "matrix-react-sdk/src/components/views/dialogs/BaseDialog";

interface IProps {
    onFinished: () => void;
}

const InviteSuccessDialog: React.FC<IProps> = ({ onFinished }) => {
    return (
        <BaseDialog className="mx_InviteResultDialog" onFinished={onFinished}>
            <div className="mx_InviteDialog_result_wrap">
                <div className="mx_InviteResultIcon mx_InviteSuccessIcon"></div>
                <h3>发送全部邀请</h3>
                <h4>我们已经向你添加的全部好友发送邀请。</h4>
            </div>
        </BaseDialog>
    );
};

export default InviteSuccessDialog;
