import { MediaHandler } from "matrix-js-sdk/src/webrtc/mediaHandler";
import SDK from 'heliumos-js-sdk';

const _getUserMediaStream = MediaHandler.prototype.getUserMediaStream;
MediaHandler.prototype.getUserMediaStream = async function(audio: boolean, video: boolean, reusable: boolean): Promise<MediaStream | void> {
    SDK.invoke('system.askForMediaAccess', (res) => {
        console.log('get app media access success', res);
        if (!res) {
            return Promise.reject();
        }
        return _getUserMediaStream.call(this, ...arguments);
    })
}
