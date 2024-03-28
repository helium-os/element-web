import SDK from "heliumos-js-sdk";
import { defaultLanguage, languageMap } from "matrix-react-sdk/src/languageHandler";
import { Roles } from "matrix-react-sdk/src/stores/UserStore";

// 获取app config
export enum AppConfigInvokeKey {
    SystemLanguage = "system.getLanguage",
    UserRoles = "user.getRoles",
    SystemMediaAccess = "system.askForMediaAccess",
}

// 订阅app config change
export enum AppConfigSubscribeKey {
    SystemLanguageChange = "system.language_changed",
}

type Handler<T> = (res: T, resolve, reject) => void;
function getAppConfigHandler<R, P>(key: string, handler: Handler<P>, params = {}) {
    return Promise.race<R>([
        new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(`获取${key} appConfig超时无响应`);
            }, 2000);
        }),
        new Promise((resolve, reject) => {
            try {
                SDK.invoke(
                    key,
                    (res) => {
                        handler?.(res, resolve, reject);
                    },
                    params,
                );
            } catch (error) {
                reject(error);
            }
        }),
    ]);
}

// 获取desktop语言设置
export function getLanguage() {
    return getAppConfigHandler<string, string>(AppConfigInvokeKey.SystemLanguage, (res, resolve, reject) => {
        console.log("get app language config success", res);
        resolve(languageMap.get(res) || defaultLanguage);
    });
}

// 获取desktop当前用户权限
export function getUserRoles() {
    return getAppConfigHandler<Roles, Roles>(AppConfigInvokeKey.UserRoles, (res, resolve, reject) => {
        console.log("get app user roles success", res);
        resolve(res);
    });
}

// 请求desktop音视频权限
export function askForMediaAccess(audio: boolean, video: boolean) {
    const reqAccess = [audio, video];

    return getAppConfigHandler<void, [boolean, boolean]>(
        AppConfigInvokeKey.SystemMediaAccess,
        (res, resolve, reject) => {
            console.log("get app media access success", res);
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
}
