import { AutoDiscovery } from "matrix-js-sdk/src/autodiscovery";
import { needRequestIntercept } from "./fetch";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";

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
    console.log(
        "AutoDiscovery fetch",
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
