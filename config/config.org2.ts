const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent('http://127.0.0.1:61717'); // 端口号是起desktop后，proxy随机生成的port

module.exports = {
    define: {
        ORG_ID: 'org2'
    },
    theme: {},
    proxy: {
        "/heliumos-chat-api": {
            target: "https://chat.system.app.org2",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-chat-api": "" },
            agent,
        },
        "/heliumos-user-api": {
            target: "https://user.system.app.org2",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
            agent,
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.org2",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
            agent,
        }
    }
}
