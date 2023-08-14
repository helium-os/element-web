module.exports = {
    define: {
        ORG_ID: 'heliumos'
    },
    theme: {},
    proxy: {
        "/heliumos-user-api": {
            target: "https://user.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-user-api": "" },
        },
        "/heliumos-org-api": {
            target: "https://transaction-agent.heliumos",
            changeOrigin: true,
            secure: false,
            pathRewrite: { "^/heliumos-org-api": "" },
        }
    }
}
