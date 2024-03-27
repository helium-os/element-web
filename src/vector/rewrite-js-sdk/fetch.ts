import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { getMatrixServerOrigin, isInDesktop } from "matrix-react-sdk/src/utils/env";

// 获取最终请求的地址
export function getRequestResource(resource: string | URL) {
    console.log(
        "getRequestResource isInDesktop",
        isInDesktop,
        "resource",
        resource,
        "finalResource",
        isInDesktop
            ? resource
            : resource instanceof URL
              ? resource.href.replace(getMatrixServerOrigin(), "")
              : (resource as string).replace(getMatrixServerOrigin(), ""),
    );
    if (isInDesktop) return resource;

    // 网页端做请求拦截
    return resource instanceof URL
        ? resource.href.replace(getMatrixServerOrigin(), "")
        : (resource as string).replace(getMatrixServerOrigin(), "");
}

// 获取最终请求的options
export function getRequestOptions(options) {
    return {
        ...options,
        ...(isInDesktop ? {} : { credentials: "include" }),
    };
}

const _fetch = FetchHttpApi.prototype.fetch;
FetchHttpApi.prototype.fetch = function (resource, options) {
    const finalResource = getRequestResource(resource);
    return _fetch.call(this, finalResource, getRequestOptions(options));
};
