const { HttpsProxyAgent } = require("https-proxy-agent");

/**
 * 端口号是通过调用runProxy所起的本地node服务端口号
 * 如果当前开发模式为App模式，端口号为本地heliumos-app项目所起的公共服务端口号
 * 如果当前开发模式为Destkop模式，端口号为本地heliumos-client-desktop项目所起的node服务端口号
 * 如果当前开发模式为Website模式，端口号以上两种都可以
 */
const target = "http://127.0.0.1:56236";

const agent = new HttpsProxyAgent(target);

module.exports = {
    define: {
        ORG_ID: "heliumos",
    },
    theme: {},
    proxy: {
        // 各端公用代理
        "/heliumos-chat-api": {
            target: "https://matrix.system.app.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-chat-api": "" },
            agent,
        },
        "/heliumos-user-api": {
            target: "https://user.user.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
            agent,
        },
        "/heliumos-org-api": {
            target: "https://system-api.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
            agent,
        },

        // web端代理
        "/web/_matrix": {
            target: "https://matrix.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: {
                "^/web/_matrix": "/_matrix",
            },
            agent,
        },
        "/web/.well-known": {
            target: "https://matrix.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: {
                "^/web/.well-known": "/.well-known",
            },
            agent,
        },
        "/web/ipfs": {
            target: "https://file.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: {
                "^/web/ipfs": "/ipfs",
            },
            agent,
        },

        // 本地开发app端代理，方便本地调试【测试环境和生产环境不需要相关nginx配置】
        "/app": {
            target,
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/app": "" },
        },
    },
};
