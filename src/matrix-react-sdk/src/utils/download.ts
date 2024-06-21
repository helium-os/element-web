import { isAppModelDev, isInApp } from "matrix-react-sdk/src/utils/env";
import rnBridge, { SendMsgType } from "matrix-react-sdk/src/utils/ReactNativeBridge";

interface DownloadData {
    url: string;
    name: string;
}

export function download(src: string, name: string) {
    console.log("download", "src=", src, "name=", name);

    if (isInApp && !isAppModelDev) {
        downloadInApp(src, name);
        return;
    }

    const a = document.createElement("a");
    a.href = src;
    if (name) a.download = name;
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    a.click();
}

export function downloadInApp(url: string, name: string) {
    rnBridge.send<DownloadData>(SendMsgType.Download, {
        url,
        name,
    });
}
