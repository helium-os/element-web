const Url = require("url-parse");
import { getMatrixServerOrigin, isInDesktop, isInApp, getIpfsServerOrigin } from "matrix-react-sdk/src/utils/env";

// 拦截fetch请求
const _fetch = window.fetch;
window.fetch = function (resource, options) {
    if (resource instanceof Request) {
        return _fetch({
            ...resource,
            url: getRequestUrl(resource.url) as string,
            credentials: getCredentials(),
        });
    }

    return _fetch(getRequestUrl(resource), getRequestOptions(options));
};

// 获取最终请求的url
export function getRequestUrl(resource: string | URL): string {
    const url = new Url(resource);
    const { origin, href } = url;

    switch (origin) {
        case getMatrixServerOrigin():
        case getIpfsServerOrigin():
            return getRequestUrlInPlatform(resource, origin);
        default:
            return href;
    }
}

// 获取最终请求的options
export function getRequestOptions(options) {
    return {
        ...options,
        credentials: getCredentials(),
    };
}

// 获取最终请求的credentials（是否允许携带cookie）
export function getCredentials() {
    return isInDesktop || isInApp ? "same-origin" : "include";
}

/**
 * 获取不同平台的请求地址
 * @param resource 请求URL
 * @param needProxiedOrigin 需要被拦截的origin
 */
export function getRequestUrlInPlatform(resource: string | URL, needProxiedOrigin: string): string {
    const url = new Url(resource);
    const { origin, href, query } = url;

    // 客户端不做拦截
    if (isInDesktop) return href;

    // app端做请求拦截，添加real-origin参数
    if (isInApp) {
        if (origin === needProxiedOrigin) {
            const searchParams = new URLSearchParams(query);
            searchParams.set("real-origin", needProxiedOrigin);
            url.set("query", searchParams.toString());
        }
        return url.toString().replace(needProxiedOrigin, "");
    }

    // web网页端做请求拦截（本地开发 & 官网chat）
    return href.replace(needProxiedOrigin, "/web");
}
