import AppMessage from "app-sdk";
import { defaultLanguage, languageMap } from "../i18n/map";

export const appObserverKeyMap = {
    languageChange: 'system.language_changed'
}

export function getLanguage(): Promise<string> {
    return new Promise((resolve, reject) => {
        AppMessage?.getMessage?.('system.getLanguage', (res) => {
            console.log('get app language config success', res);
            resolve(languageMap.get(res) || defaultLanguage);
        });
    });
}

