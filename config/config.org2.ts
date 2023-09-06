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
        },
        "/heliumos-user-api": {
            target: "https://user.system.app.org2",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.org2",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
        }
    }
}
