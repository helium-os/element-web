import { useEffect, useState, useCallback } from "react";
import LayoutStore, { UPDATE_SETTINGS_SHOW_LEFT_PANEL } from "matrix-react-sdk/src/stores/LayoutStore";

export type SetShowRoomSettingsLeftPanel = (show: boolean) => void;

export function useShowSettingsLeftPanel(): [boolean, SetShowRoomSettingsLeftPanel] {
    const [show, setShow] = useState<boolean>(LayoutStore.instance.showSettingsLeftPanel);

    useEffect(() => {
        const updateShowLeftPanel = () => {
            setShow(LayoutStore.instance.showSettingsLeftPanel);
        };

        LayoutStore.instance.on(UPDATE_SETTINGS_SHOW_LEFT_PANEL, updateShowLeftPanel);
        return () => {
            LayoutStore.instance.off(UPDATE_SETTINGS_SHOW_LEFT_PANEL, updateShowLeftPanel);
        };
    }, []);

    const setShowLeftPanel: SetShowRoomSettingsLeftPanel = useCallback((show) => {
        LayoutStore.instance.setShowSettingsLeftPanel(show);
    }, []);

    return [show, setShowLeftPanel];
}
