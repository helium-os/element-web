import React, { useRef, memo } from "react";

interface IProps {
    className?: string;
    style?: object;
    children: React.ReactNode;
    loadMore?: () => any;
}

const ScrollLoader: React.FC<IProps> = ({ className, style, children, loadMore }) => {
    const innerRef = useRef(null);
    const onScroll = (e) => {
        const scrollElement = e.target;
        if (!innerRef.current) return;

        if (scrollElement.scrollTop + scrollElement.clientHeight >= innerRef.current.scrollHeight) {
            loadMore?.();
        }
    };

    return (
        <div className={`mx_ScrollLoader_wrap ${className}`} style={style} onScroll={onScroll}>
            <div className="mx_ScrollLoader_inner" ref={innerRef}>
                {children}
            </div>
        </div>
    );
};

export default memo(ScrollLoader);
