import React, { useMemo, memo, forwardRef, ForwardedRef } from "react";
import { SetShowLeftPanel, useShowSettingsLeftPanel } from "matrix-react-sdk/src/hooks/room/useShowSettingsPanel";

export interface ShowSettingsLeftPanelProps {
    showSettingsLeftPanel: boolean;
    setShowSettingsLeftPanel: SetShowLeftPanel;
}

export interface Opts {
    forwardRef: boolean;
}

// 判断是否展示room设置页面左侧边栏
export default function withShowSettingsLeftPanel<P>(
    Component: React.FC<P> | React.ComponentType<P>,
    opts: Opts = {} as Opts,
) {
    const Proxy = (props: P, ref?: ForwardedRef<any>) => {
        const [showSettingsLeftPanel, setShowSettingsLeftPanel] = useShowSettingsLeftPanel();

        const refProps = useMemo(() => (opts.forwardRef ? { ref } : {}), [ref]);

        return <Component {...props} {...{ showSettingsLeftPanel, setShowSettingsLeftPanel }} {...refProps} />;
    };

    return memo(opts.forwardRef ? forwardRef(Proxy) : Proxy);
}
