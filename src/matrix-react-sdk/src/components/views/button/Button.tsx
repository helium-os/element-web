import React, { memo } from "react";
import { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";

export enum ButtonType {
    Primary = "primary",
    Danger = "danger",
    Link = "link",
}

export enum ButtonSize {
    Small = "small",
    Default = "default",
    Large = "large",
}
export interface ButtonProps {
    type: ButtonType;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    style?: any;
    onClick?: (event: ButtonEvent) => void;
    children: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({
    children,
    type,
    className,
    style,
    size = ButtonSize.Default,
    disabled = false,
    loading = false,
    onClick,
}) => {
    return (
        <button
            disabled={disabled}
            className={`mx_btn mx-btn-${type} mx-btn-${size} ${className || ""}`}
            style={style}
            onClick={(e) => onClick?.(e)}
        >
            {loading && <div className="mx_btn_loading" />}
            {children}
        </button>
    );
};

export default memo(Button);
