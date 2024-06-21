import dis from "matrix-react-sdk/src/dispatcher/dispatcher";
export enum SendMsgType {
    LoadedStatus = "loadedStatus", // 页面是否加载完成
    Download = "download", // 下载
}

export enum ReactNativeAction {
    ViewRoom = `rn_viewRoom`,
}

class ReactNativeBridge {
    constructor() {
        window.addEventListener("message", this.onMessage, false); // 接收ios app端发送的消息
        document.addEventListener("message", this.onMessage, false); // 接收android app端发送的消息
    }

    // 接收到React Native的消息
    onMessage(event) {
        try {
            const { from, type, data } = JSON.parse(event.data);
            if (from !== "ReactNative") return;
            console.log("Received message from React Native App: type=", type, "data=", data);

            dis.dispatch({
                action: `rn_${type}`,
                data,
            });
        } catch (error) {}
    }

    // 向React Native Webview发送消息
    send<T>(type: SendMsgType, data: T) {
        window.ReactNativeWebView?.postMessage(
            JSON.stringify({
                type,
                data,
            }),
        );
    }
}

const rnBridge = new ReactNativeBridge();
export default rnBridge;
