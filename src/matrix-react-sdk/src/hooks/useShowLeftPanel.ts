import { useEffect, useState, useCallback } from "react";
import LayoutStore, { UPDATE_SHOW_LEFT_PANEL } from "matrix-react-sdk/src/stores/LayoutStore";

export type SetShowLeftPanel = (show: boolean) => void;

export function useShowLeftPanel(): [boolean, SetShowLeftPanel] {
    const [show, setShow] = useState<boolean>(LayoutStore.instance.showLeftPanel);

    useEffect(() => {
        const updateShowLeftPanel = () => {
            setShow(LayoutStore.instance.showLeftPanel);
        };

        LayoutStore.instance.on(UPDATE_SHOW_LEFT_PANEL, updateShowLeftPanel);
        return () => {
            LayoutStore.instance.off(UPDATE_SHOW_LEFT_PANEL, updateShowLeftPanel);
        };
    }, []);

    const setShowLeftPanel: SetShowLeftPanel = useCallback((show) => {
        LayoutStore.instance.setShowLeftPanel(show);
    }, []);

    return [show, setShowLeftPanel];
}
