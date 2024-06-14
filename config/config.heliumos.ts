const { HttpsProxyAgent } = require("https-proxy-agent");
const agent = new HttpsProxyAgent("http://127.0.0.1:53496"); // 端口号是起desktop后，proxy随机生成的port

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
    },
};
