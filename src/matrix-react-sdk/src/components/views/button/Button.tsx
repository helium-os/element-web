import React, { memo } from "react";
import { ButtonEvent } from "matrix-react-sdk/src/components/views/elements/AccessibleButton";
import Icon from "matrix-react-sdk/src/components/views/icon/BaseIcon";

export enum ButtonType {
    Default = "default",
    Primary = "primary",
    Text = "text",
}

export enum ButtonSize {
    Small = "small",
    Default = "default",
    Large = "large",
}
export interface ButtonProps {
    type?: ButtonType;
    size?: ButtonSize;
    danger?: boolean;
    disabled?: boolean;
    block?: boolean;
    loading?: boolean;
    className?: string;
    style?: any;
    icon?: React.ReactNode;
    iconClassName?: string;
    onClick?: (event: ButtonEvent) => void;
    children?: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({
    children,
    type = ButtonType.Default,
    className,
    style,
    size = ButtonSize.Default,
    block = false,
    disabled = false,
    danger = false,
    loading = false,
    icon,
    iconClassName,
    onClick,
}) => {
    return (
        <button
            disabled={disabled}
            className={`mx_btn mx-btn-${type} mx-btn-size-${size} ${className || ""} ${block ? "mx-btn-block" : ""} ${
                danger ? "mx-btn-danger" : ""
            }`}
            style={style}
            onClick={(e) => onClick?.(e)}
        >
            {loading && <div className="mx_btn_loading" />}
            {icon && <Icon icon={icon} className={iconClassName} />}
            {children}
        </button>
    );
};

export default memo(Button);
