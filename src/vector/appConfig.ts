import SDK from "heliumos-js-sdk";
import { defaultLanguage, languageMap } from "matrix-react-sdk/src/languageHandler";

export const appEventKeyMap = {
    languageChange: "system.language_changed",
};

// 获取desktop语言设置
export function getLanguage(): Promise<string> {
    return new Promise((resolve, reject) => {
        SDK.invoke("system.getLanguage", (res) => {
            console.log("get app language config success", res);
            resolve(languageMap.get(res) || defaultLanguage);
        });
    });
}

// 请求desktop音视频权限
export function askForMediaAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
        SDK.invoke("system.askForMediaAccess", (res) => {
            console.log("get app media access success", res);
            if (!res) {
                throw "media access from app is false";
            }
            resolve();
        });
    });
}
