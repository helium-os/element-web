import React, { memo } from "react";

interface IProps {
    children: string | React.ReactNode;
    className?: string;
    style?: object;
}
const DropdownButton: React.FC<IProps> = ({ children, className, style }) => {
    return (
        <div className={`mx_DropdownButton ${className}`} style={style}>
            {children}
            <span className="mx_DropdownIcon" />
        </div>
    );
};

export default memo(DropdownButton);
