import { AutoDiscovery } from "matrix-js-sdk/src/autodiscovery";
import { needRequestIntercept } from "./fetch";

const _fetch = AutoDiscovery.prototype.fetch;
AutoDiscovery.prototype.fetch = function (resource, options) {
    const finalResource = needRequestIntercept && resource instanceof URL ? resource.pathname : resource; // 网页端做请求拦截
    return _fetch.call(this, finalResource, {
        ...options,
        ...(needRequestIntercept ? { credentials: "include" } : {}), // 网页端需要携带cookie
    });
};
