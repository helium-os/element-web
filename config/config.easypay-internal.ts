const { HttpsProxyAgent } = require('https-proxy-agent');
const agent = new HttpsProxyAgent('http://127.0.0.1:50260'); // 端口号是起desktop后，proxy随机生成的port

module.exports = {
    define: {
        ORG_ID: 'easypay-internal'
    },
    theme: {},
    proxy: {
        "/heliumos-chat-api": {
            target: "https://chat.system.app.easypay-internal",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-chat-api": "" },
            agent
        },
        "/heliumos-user-api": {
            target: "https://user.system.app.easypay-internal",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
            agent
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.system.service.easypay-internal",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
            agent
        }
    }
}
