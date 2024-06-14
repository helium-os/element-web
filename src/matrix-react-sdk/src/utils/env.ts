// 本地开发模式
enum DevModel {
    Desktop,
    WebSite,
}
const devModel: DevModel = DevModel.Desktop;

export const isDev = process.env.NODE_ENV === "development";

const ua = navigator.userAgent;

export const isInApp = ua.toLocaleLowerCase().includes("heliumos app"); // 是否是在app端
export const isInDesktop = ua.toLocaleLowerCase().includes("heliumos") && !isInApp; // 是否是在桌面端

export const isWebSite = !isInDesktop && !isInApp; // 是否是web网页端
export const isProdWebSite = isWebSite && !isDev; // 是否是打包后的web网页端

export const isDesktopModelDev = isDev && devModel === DevModel.Desktop; // 本地开发模式是否是客户端模式

export const isWebSiteModelDev = isDev && devModel === DevModel.WebSite; // 本地开发模式是否是wen网页端模式

export const matrixHostnamePrefix = "matrix.system.service"; // matrix服务域名前缀
export const ipfsHostnamePrefix = "file.system.service"; // ipfs服务域名前缀

export const defaultOrgId = "heliumos";
export function getOrgId(): string {
    if (isDev) {
        return CHAT_ENV_ORG_ID;
    }

    // 如果是网页端
    if (isProdWebSite) {
        return defaultOrgId;
    }

    let hostname = window.location.hostname;

    // 如果是app端
    if (isInApp) {
        const { search } = new URL(window.location.href);
        const searchParams = new URLSearchParams(search);
        const origin = searchParams.get("real-origin") || "";
        hostname = origin.substring(origin.indexOf("/") + 2);
    }

    return hostname.split(".").pop();
}

// 获取当前org matrix service origin
export function getMatrixServerOrigin(): string {
    return `https://${matrixHostnamePrefix}.${getOrgId()}`;
}

// 获取当前org ipfs service origin
export function getIpfsServerOrigin(): string {
    return `https://${ipfsHostnamePrefix}.${getOrgId()}`;
}

// 获取接口请求前缀
export function getApiPrefix() {
    return isProdWebSite || isWebSiteModelDev ? "/web" : "";
}
