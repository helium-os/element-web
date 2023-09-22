import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import SDK from "heliumos-js-sdk";

const _getUserMediaStream = MediaHandler.prototype.getUserMediaStream;
// @ts-ignore
MediaHandler.prototype.getUserMediaStream = async function (...args): Promise<MediaStream | void> {
    SDK.invoke("system.askForMediaAccess", (res) => {
        console.log("get app media access success", res);
        if (!res) {
            return Promise.reject("media access from app is false");
        }
        return _getUserMediaStream.call(this, ...args);
    });
};
