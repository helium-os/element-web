import { getRequestResource } from "./fetch";

// 拦截xhr open方法，请求时对url做处理
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return _open.call(this, method, getRequestResource(url), ...rest);
};
