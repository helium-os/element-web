import React, { memo } from "react";

export interface IconProps {
    className?: string;
    icon: React.ReactNode;
}

const BaseIcon: React.FC<IconProps> = ({ icon, className }) => {
    return <div className={`mx_icon ${className}`} style={{ maskImage: `url("${icon}")` }}></div>;
};

export default memo(BaseIcon);
