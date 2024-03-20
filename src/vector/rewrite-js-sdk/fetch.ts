import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { isDev, isInDesktop } from "matrix-react-sdk/src/utils/env";

export const needRequestIntercept = !isDev && !isInDesktop; // 是否需要做请求拦截

const _fetch = FetchHttpApi.prototype.fetch;
FetchHttpApi.prototype.fetch = function (resource, options) {
    const finalResource = needRequestIntercept && resource instanceof URL ? resource.pathname : resource; // 网页端做请求拦截
    return _fetch.call(this, finalResource, {
        ...options,
        ...(needRequestIntercept ? { credentials: "include" } : {}), // 网页端需要携带cookie
    });
};
