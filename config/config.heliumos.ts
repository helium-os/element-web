const { HttpsProxyAgent } = require("https-proxy-agent");
const agent = new HttpsProxyAgent("http://127.0.0.1:50622"); // 端口号是起desktop后，proxy随机生成的port

module.exports = {
    define: {
        ORG_ID: "heliumos",
    },
    theme: {},
    proxy: {
        "/heliumos-chat-api": {
            target: "https://matrix.system.app.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-chat-api": "" },
            agent,
        },
        "/heliumos-user-api": {
            target: "http://user-heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
            agent,
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
            agent,
        },
        "/_matrix": {
            target: "https://matrix.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            agent,
        },
        "/.well-known": {
            target: "https://matrix.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            agent,
        },
        "/ipfs": {
            target: "https://file.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            agent,
        },
    },
};
