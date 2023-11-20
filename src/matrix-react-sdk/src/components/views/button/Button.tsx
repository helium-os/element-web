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
    className?: string;
    style?: any;
    onClick?: (event: ButtonEvent) => void;
    children: React.ReactNode;
}
const Button: React.FC<IProps> = ({ children, type, className, style, disabled, onClick }) => {
    return (
        <button
            disabled={disabled}
            className={`mx_btn mx-btn-${type} ${className || ""}`}
            style={style}
            onClick={(e) => onClick?.(e)}
        >
            {children}
        </button>
    );
};

export default memo(Button);
