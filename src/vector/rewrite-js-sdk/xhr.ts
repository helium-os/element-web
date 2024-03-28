import { getRequestResource } from "./fetch";

const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return _open.call(this, method, getRequestResource(url), ...rest);
};
