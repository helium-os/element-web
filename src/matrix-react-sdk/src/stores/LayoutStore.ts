import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "matrix-react-sdk/src/dispatcher/actions";
import { isInApp } from "matrix-react-sdk/src/utils/env";

export const UPDATE_SHOW_LEFT_PANEL = Symbol("show-left-panel");
export const UPDATE_SHOW_RIGHT_CONTENT = Symbol("show-right-content");

interface IState {}

export default class LayoutStore extends AsyncStoreWithClient<IState> {
    private _showLeftPanel = true; // 是否展示左侧边栏
    private _showRightContent = true; // 是否展示右侧内容
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

    public get showRightContent(): boolean {
        return this._showRightContent;
    }

    public setShowRightContent(show: boolean) {
        this._showRightContent = show;
        this.emit(UPDATE_SHOW_RIGHT_CONTENT, this._showRightContent);
    }
}
