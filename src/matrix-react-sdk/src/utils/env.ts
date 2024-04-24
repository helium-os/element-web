const ua = navigator.userAgent;

export const isDev = process.env.NODE_ENV === "development";

export const isInApp = ua.toLocaleLowerCase().includes("heliumos app"); // 是否是在app端
export const isInDesktop = ua.toLocaleLowerCase().includes("heliumos") && !isInApp; // 是否是在桌面端

export const isProdWebSite = !isDev && !isInDesktop && !isInApp; // 是否是打包后的网页端

export const hsNamePrefix = "matrix.system.service";
export const ipfsPrefix = "file.system.service";

export const defaultOrgId = "heliumos";
export function getOrgId(): string {
    if (isDev) {
        return CHAT_ENV_ORG_ID;
    }
    // 如果是网页端
    if (isProdWebSite) {
        return defaultOrgId;
    }
    const { hostname } = window.location;
    return hostname.split(".").pop();
}

export function getMatrixServerOrigin(): string {
    return `https://${hsNamePrefix}.${getOrgId()}`;
}

export function getIpfsServerOrigin(): string {
    return `https://${ipfsPrefix}.${getOrgId()}`;
}
