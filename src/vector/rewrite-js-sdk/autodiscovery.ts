import { AutoDiscovery } from "matrix-js-sdk/src/autodiscovery";
import { needRequestIntercept } from "./fetch";

const _fetch = AutoDiscovery.fetch;
AutoDiscovery.fetch = function (resource, options) {
    let finalResource = resource;
    // 网页端做请求拦截
    if (needRequestIntercept) {
        finalResource =
            resource instanceof URL
                ? resource.pathname
                : (finalResource as string).replace("https://matrix.system.service.heliumos", "");
    }
    console.log("AutoDiscovery finalResource", finalResource, "resource", resource);
    return _fetch.call(this, finalResource, {
        ...options,
        ...(needRequestIntercept ? { credentials: "include" } : {}), // 网页端需要携带cookie
    });
};
