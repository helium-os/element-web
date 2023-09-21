import SDK from "heliumos-js-sdk";
import { defaultLanguage, languageMap } from "matrix-react-sdk/src/languageHandler";

export const appEventKeyMap = {
    languageChange: 'system.language_changed'
}

export function getLanguage(): Promise<string> {
    return new Promise((resolve, reject) => {
        SDK.invoke('system.getLanguage', (res) => {
            console.log('get app language config success', res);
            resolve(languageMap.get(res) || defaultLanguage);
        });
    });
}

