import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";
import { isInApp } from "matrix-react-sdk/src/utils/env";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

export const UPDATE_SHOW_LEFT_PANEL = Symbol("show-left-panel");
export const UPDATE_SETTINGS_SHOW_LEFT_PANEL = Symbol("settings-show-left-panel");

interface IState {}

export default class LayoutStore extends AsyncStoreWithClient<IState> {
    private _showLeftPanel = true; // 是否展示主页面左侧边栏

    private _showSettingsLeftPanel = true; // 是否展示room/space设置页面左侧边栏
    public static get instance(): LayoutStore {
        if (!window.mxLayoutStore) {
            window.mxLayoutStore = new LayoutStore();
        }
        return window.mxLayoutStore;
    }

    public constructor() {
        super(defaultDispatcher, {});
    }

    protected async onAction(payload): Promise<void> {
        switch (payload.action) {
            case Action.ViewRoom: {
                const { room_id } = payload;
                const cli = MatrixClientPeg.get();
                const room = cli?.getRoom(room_id);
                if (!room) return;

                const isSpaceRoom = room.isSpaceRoom();
                if (isSpaceRoom) return;

                this.setShowLeftPanel(false);
                break;
            }

            case Action.ViewHomePage:
                break;
        }
    }

    public get showLeftPanel(): boolean {
        return this._showLeftPanel;
    }

    public setShowLeftPanel(show: boolean) {
        if (!isInApp) return;

        this._showLeftPanel = show;
        this.emit(UPDATE_SHOW_LEFT_PANEL, this._showLeftPanel);
    }

    public get showSettingsLeftPanel(): boolean {
        return this._showSettingsLeftPanel;
    }

    public setShowSettingsLeftPanel(show: boolean) {
        if (!isInApp) return;

        this._showSettingsLeftPanel = show;
        this.emit(UPDATE_SETTINGS_SHOW_LEFT_PANEL, this._showSettingsLeftPanel);
    }
}
