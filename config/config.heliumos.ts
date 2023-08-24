module.exports = {
    define: {
        ORG_ID: 'heliumos'
    },
    theme: {},
    proxy: {
        "/heliumos-chat-api": {
            target: "https://matrix.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-chat-api": "" },
        },
        "/heliumos-user-api": {
            target: "https://user.system.app.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.system.service.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
        }
    }
}
