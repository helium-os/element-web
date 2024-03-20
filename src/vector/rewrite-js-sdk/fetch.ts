import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { isInDesktop } from "matrix-react-sdk/src/utils/env";

const _fetch = FetchHttpApi.prototype.fetch;
FetchHttpApi.prototype.fetch = function (resource, options) {
    const finalResource = !isInDesktop && resource instanceof URL ? resource.pathname : resource; // 网页端做请求拦截
    return _fetch.call(this, finalResource, {
        ...options,
        ...(isInDesktop ? {} : { credentials: "include" }), // 网页端需要携带cookie
    });
};
