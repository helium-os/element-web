import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { getMatrixServerOrigin, isProdWebSite } from "matrix-react-sdk/src/utils/env";

export const needRequestIntercept = isProdWebSite; // 网页端做请求拦截

// 获取最终请求的地址
export function getRequestResource(resource: string | URL) {
    if (!needRequestIntercept) return resource;

    // 网页端做请求拦截
    return resource instanceof URL
        ? resource.href.replace(getMatrixServerOrigin(), "")
        : (resource as string).replace(getMatrixServerOrigin(), "");
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
