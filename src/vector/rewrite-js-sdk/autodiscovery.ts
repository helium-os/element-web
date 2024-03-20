import { AutoDiscovery } from "matrix-js-sdk/src/autodiscovery";
import { getRequestOptions, getRequestResource, needRequestIntercept } from "./fetch";

const _fetch = AutoDiscovery.fetch;
AutoDiscovery.fetch = function (resource, options) {
    const finalResource = getRequestResource(resource);
    return _fetch.call(this, finalResource, getRequestOptions(options));
};
