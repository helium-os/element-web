import React, { memo } from "react";
import { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";

export enum ButtonType {
    Primary = "primary",
    Danger = "danger",
    Link = "link",
}
interface IProps {
    type: ButtonType;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    style?: any;
    onClick?: (event: ButtonEvent) => void;
    children: React.ReactNode;
}
const Button: React.FC<IProps> = ({ children, type, className, style, disabled = false, loading = false, onClick }) => {
    return (
        <button
            disabled={disabled}
            className={`mx_btn mx-btn-${type} ${className || ""}`}
            style={style}
            onClick={(e) => onClick?.(e)}
        >
            {loading && <div className="mx_btn_loading" />}
            {children}
        </button>
    );
};

export default memo(Button);
