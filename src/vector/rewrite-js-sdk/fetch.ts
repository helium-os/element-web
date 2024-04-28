const Url = require("url-parse");
import { getMatrixServerOrigin, isInDesktop, isInApp, getIpfsServerOrigin } from "matrix-react-sdk/src/utils/env";

/**
 * 获取不同平台的请求地址
 * @param resource 请求URL
 * @param proxyOrigin 需要被拦截的origin
 */
export function getRequestUrlInPlatform(resource: string | URL, proxyOrigin: string): string {
    console.log("getRequestUrlInPlatform isInDesktop = ", isInDesktop, "isInApp = ", isInApp, "resource = ", resource);
    const url = new Url(resource);
    const { origin, href, query } = url;

    // 客户端不做拦截
    if (isInDesktop) return href;

    // app端做请求拦截，添加real-origin参数
    if (isInApp) {
        if (origin === proxyOrigin) {
            const searchParams = new URLSearchParams(query);
            searchParams.set("real-origin", proxyOrigin);
            url.set("query", searchParams.toString());
        }
        return url.toString().replace(proxyOrigin, "");
    }

    // web网页端做请求拦截
    return href.replace(proxyOrigin, "/web");
}

// 获取matrix服务最终的请求地址
export function getMatrixRequestUrl(resource: string | URL): string {
    return getRequestUrlInPlatform(resource, getMatrixServerOrigin());
}

// 获取ipfs服务最终的请求地址
export function getIpfsRequestUrl(resource: string | URL): string {
    return getRequestUrlInPlatform(resource, getIpfsServerOrigin());
}

// 获取最终请求的credentials（是否允许携带cookie）
export function getCredentials() {
    return isInDesktop || isInApp ? "same-origin" : "include";
}

// 获取最终请求的options
export function getRequestOptions(options) {
    return {
        ...options,
        credentials: getCredentials(),
    };
}

// 拦截fetch请求
const _fetch = window.fetch;
window.fetch = function (resource, options) {
    if (resource instanceof Request) {
        return _fetch({
            ...resource,
            url: getMatrixRequestUrl(resource.url) as string,
            credentials: getCredentials(),
        });
    }

    return _fetch(getMatrixRequestUrl(resource), getRequestOptions(options));
};
