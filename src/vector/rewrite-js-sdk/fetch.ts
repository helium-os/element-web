import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { isDev, isInDesktop } from "matrix-react-sdk/src/utils/env";

export const needRequestIntercept = !isDev && !isInDesktop; // 是否需要做请求拦截

// 获取最终请求的地址
export function getRequestResource(resource: string | URL) {
    let finalResource = resource;
    // 网页端做请求拦截
    if (needRequestIntercept) {
        finalResource =
            resource instanceof URL
                ? resource.pathname
                : (finalResource as string).replace("https://matrix.system.service.com", "");
    }
    return finalResource;
}

// 获取最终请求的options
export function getRequestOptions(options) {
    return {
        ...options,
        ...(needRequestIntercept ? { credentials: "include" } : {}), // 网页端需要携带cookie
    };
}

const _fetch = FetchHttpApi.prototype.fetch;
FetchHttpApi.prototype.fetch = function (resource, options) {
    const finalResource = getRequestResource(resource);
    return _fetch.call(this, finalResource, getRequestOptions(options));
};
