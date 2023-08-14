module.exports = {
    define: {
        ORG_ID: 'org2'
    },
    theme: {},
    proxy: {
        "/heliumos-user-api": {
            target: "https://user.org2",
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
