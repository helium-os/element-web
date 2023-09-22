import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import { askForMediaAccess } from "../appConfig";

const _getUserMediaStream = MediaHandler.prototype.getUserMediaStream;
// @ts-ignore
MediaHandler.prototype.getUserMediaStream = async function (...args): Promise<MediaStream | string> {
    try {
        await askForMediaAccess();
        return _getUserMediaStream.call(this, ...args);
    } catch (error) {
        console.log("获取desktop音视频权限失败", error);
        return Promise.reject(error);
    }
};
