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
export function askForMediaAccess(audio: boolean, video: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        const reqAccess = [audio, video];
        SDK.invoke(
            "system.askForMediaAccess",
            (res: [boolean, boolean]) => {
                const result = !reqAccess.find((reqAccess, index) => reqAccess && !res[index]);

                console.log("askForMediaAccess", "reqAccess", reqAccess, "resAccess", res, "result", result);
                if (!result) {
                    return reject("media access from app is false");
                }
                return resolve();
            },
            {
                data: reqAccess,
            },
        );
    });
}
