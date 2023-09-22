import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import { askForMediaAccess } from "../appConfig";

const _getUserMediaStream = MediaHandler.prototype.getUserMediaStream;
// @ts-ignore
MediaHandler.prototype.getUserMediaStream = async function (...args): Promise<MediaStream | string> {
    try {
        await askForMediaAccess(args[0], args[1]);
        return _getUserMediaStream.call(this, ...args);
    } catch (error) {
        console.log("desktop没有打开录音&摄像头权限，error is", error);
        return Promise.reject(error);
    }
};
