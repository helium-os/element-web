import { getMatrixServerOrigin, isInDesktop } from "matrix-react-sdk/src/utils/env";

// 获取最终请求的地址
export function getRequestResource(resource: string | URL) {
    if (isInDesktop) return resource;

    // 网页端做请求拦截
    return resource instanceof URL
        ? resource.href.replace(getMatrixServerOrigin(), "")
        : (resource as string).replace(getMatrixServerOrigin(), "");
}

// 获取最终请求的credentials（是否允许携带cookie）
export function getCredentials() {
    return isInDesktop ? "same-origin" : "include";
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
window.fetch = async function (resource, options) {
    if (resource instanceof Request) {
        const response = await _fetch({
            ...resource,
            url: getRequestResource(resource.url) as string,
            credentials: getCredentials(),
        });
        return response;
    }

    const response = await _fetch(getRequestResource(resource), getRequestOptions(options));
    return response;
};
