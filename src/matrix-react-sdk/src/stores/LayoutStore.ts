import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";
import { isInApp } from "matrix-react-sdk/src/utils/env";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

export const UPDATE_SHOW_LEFT_PANEL = Symbol("show-left-panel");
export const UPDATE_SHOW_RIGHT_CONTENT = Symbol("show-right-content");

interface IState {}

export default class LayoutStore extends AsyncStoreWithClient<IState> {
    private _showLeftPanel = true; // 是否展示左侧边栏
    private _showMainPanel = true; // 是否展示主面板
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
        if (isInApp) {
            this._showLeftPanel = show;
            this.emit(UPDATE_SHOW_LEFT_PANEL, this._showLeftPanel);
        }
    }

    public get showMainPanel(): boolean {
        return this._showMainPanel;
    }

    public setShowMainPanel(show: boolean) {
        this._showMainPanel = show;
        this.emit(UPDATE_SHOW_RIGHT_CONTENT, this._showMainPanel);
    }
}
