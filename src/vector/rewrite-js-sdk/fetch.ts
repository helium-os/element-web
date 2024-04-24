const Url = require("url-parse");
import { getMatrixServerOrigin, isInDesktop, isInApp } from "matrix-react-sdk/src/utils/env";

// 获取最终请求的地址
export function getRequestResource(resource: string | URL): string | URL {
    console.log("getRequestResource isInDesktop = ", isInDesktop, "isInApp = ", isInApp, "resource = ", resource);
    // 客户端不做拦截
    if (isInDesktop) return resource;

    const matrixOrigin = getMatrixServerOrigin();

    const url = new Url(resource);
    const { origin, href, query } = url;

    // app端做请求拦截，添加real-origin参数
    if (isInApp) {
        if (origin === matrixOrigin) {
            const searchParams = new URLSearchParams(query);
            searchParams.set("real-origin", matrixOrigin);
            url.set("query", searchParams.toString());
        }
        return url.toString().replace(matrixOrigin, "");
    }

    // web网页端做请求拦截
    return href.replace(matrixOrigin, "/web");
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
            url: getRequestResource(resource.url) as string,
            credentials: getCredentials(),
        });
    }

    return _fetch(getRequestResource(resource), getRequestOptions(options));
};
