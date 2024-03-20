const ua = navigator.userAgent;

export const isDev = process.env.NODE_ENV === "development";
export const isInDesktop = ua.toLocaleLowerCase().includes("heliumos"); // 是否是在桌面端

export const isProdWebSite = !isDev && !isInDesktop; // 是否是打包后的网页端

export const hsNamePrefix = "matrix.system.service";

export function getOrgId(): string {
    if (isDev) {
        return CHAT_ENV_ORG_ID;
    }
    // 如果是网页端
    if (isProdWebSite) {
        return "heliumos";
    }
    const { hostname } = window.location;
    return hostname.split(".").pop();
}

export function getServerOrigin(): string {
    return `https://${hsNamePrefix}.${getOrgId()}`;
}
