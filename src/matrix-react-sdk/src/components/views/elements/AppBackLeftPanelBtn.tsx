import React, { memo } from "react";
import { useShowLeftPanel } from "matrix-react-sdk/src/hooks/useShowLeftPanel";

const AppBackLeftPanelBtn = () => {
    const [showLeftPanel, setShowLeftPanel] = useShowLeftPanel();
    return <>{!showLeftPanel && <div className="mx_RoomViewHeader_back" onClick={() => setShowLeftPanel(true)} />}</>;
};

export default memo(AppBackLeftPanelBtn);
