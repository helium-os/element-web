import { FetchHttpApi } from "matrix-js-sdk/src/http-api/fetch";
import { isDev, isInDesktop } from "matrix-react-sdk/src/utils/env";

export const needRequestIntercept = !isDev && !isInDesktop; // 是否需要做请求拦截

const _fetch = FetchHttpApi.prototype.fetch;
FetchHttpApi.prototype.fetch = function (resource, options) {
    let finalResource = resource;
    // 网页端做请求拦截
    if (needRequestIntercept) {
        finalResource =
            resource instanceof URL
                ? resource.pathname
                : (finalResource as string).replace("https://matrix.system.service.com", "");
    }

    console.log(
        "FetchHttpApi fetch",
        "needRequestIntercept",
        needRequestIntercept,
        "resource",
        resource,
        "finalResource",
        finalResource,
    );
    return _fetch.call(this, finalResource, {
        ...options,
        ...(needRequestIntercept ? { credentials: "include" } : {}), // 网页端需要携带cookie
    });
};
