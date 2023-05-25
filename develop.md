### [element-web](https://github.com/helium-os/element-web)

-   开源项目地址：[vector-im/element-web](https://github.com/vector-im/element-web)
-   该项目依赖 `matrix-js-sdk` 和 `matrix-react-sdk`

### [matrix-react-sdk](https://github.com/helium-os/matrix-react-sdk)

-   页面组件包，修改页面主要在此项目中
-   该项目依赖 `matrix-js-sdk`

### [matrix-js-sdk](https://github.com/helium-os/matrix-js-sdk)

-   此包封装了网络请求，一般不需要修改

### 本地开发

-   首先从 git 仓库 clone 以上三个项目
-   进入 matrix-js-sdk 项目，运行 `yarn install` 安装依赖
-   进入 matrix-react-sdk 项目，执行以下命令：

    ```
    yarn link
    yarn install
    ```

    -   目前远程仓库中除了 master 分支外还有三个分支：
        -   `users/songlm/5723/change_ui`：修改页面 UI
        -   `users/tianhq/login`：改用 JWT 登录和页面搜索功能的修改
        -   `users/tianhq/translate`：聊天对话翻译功能

-   进入 element-web 项目，执行以下操作：

1.  在项目根目录下创建 `config.json` 文件
2.  然后执行以下命令，完成之后在浏览器输入 `127.0.0.1:8080/ ` 即可看到页面

    ```
    yarn link matrix-react-sdk
    yarn install
    yarn start
    ```

    > config.json 文件内容如下（[查看所有配置](https://github.com/vector-im/element-web/blob/develop/docs/config.md)）：

    ```
    {
        "default_server_config": {
            "m.homeserver": {
                "base_url": "http://matrix.org1.helium/"
            }
        },
        "brand": "chat",
        "embedded_pages": {
            "login_for_welcome": true
        },
        "integrations_ui_url": "https://scalar.vector.im/",
        "integrations_rest_url": "https://scalar.vector.im/api",
        "integrations_widgets_urls": [
            "https://scalar.vector.im/_matrix/integrations/v1",
            "https://scalar.vector.im/api",
            "https://scalar-staging.vector.im/_matrix/integrations/v1",
            "https://scalar-staging.vector.im/api",
            "https://scalar-staging.riot.im/scalar/api"
        ],
        "hosting_signup_link": "https://element.io/matrix-services?utm_source=element-web&utm_medium=web",
        "bug_report_endpoint_url": "https://element.io/bugreports/submit",
        "uisi_autorageshake_app": "element-auto-uisi",
        "showLabsSettings": true,
        "roomDirectory": {
            "servers": ["matrix.org", "gitter.im", "libera.chat"]
        },
        "enable_presence_by_hs_url": {
            "https://matrix.org": false,
            "https://matrix-client.matrix.org": false
        },
        "terms_and_conditions_links": [
            {
                "url": "https://element.io/privacy",
                "text": "Privacy Policy"
            },
            {
                "url": "https://element.io/cookie-policy",
                "text": "Cookie Policy"
            }
        ],
        "hostSignup": {
            "brand": "Element Home",
            "cookiePolicyUrl": "https://element.io/cookie-policy",
            "domains": ["matrix.org"],
            "privacyPolicyUrl": "https://element.io/privacy",
            "termsOfServiceUrl": "https://element.io/terms-of-service",
            "url": "https://ems.element.io/element-home/in-app-loader"
        },
        "sentry": {
            "dsn": "https://029a0eb289f942508ae0fb17935bd8c5@sentry.matrix.org/6",
            "environment": "develop"
        },
        "posthog": {
            "projectApiKey": "phc_Jzsm6DTm6V2705zeU5dcNvQDlonOR68XvX2sh1sEOHO",
            "apiHost": "https://posthog.element.io"
        },
        "privacy_policy_url": "https://element.io/cookie-policy",
        "features": {
            "feature_spotlight": true,
            "feature_video_rooms": true
        },
        "element_call": {
            "url": "https://element-call.netlify.app"
        },
        "setting_defaults": {
            "layout": "bubble"
        },
        "map_style_url": "https://api.maptiler.com/maps/streets/style.json?key=fU3vlMsMn4Jb6dnEIFsx"
    }
    ```

> 注意：以上三个项目只能使用 yarn 安装依赖

### 部署到测试环境

-   如果修改了 `matrix-react-sdk` 项目：
    1. `matrix-react-sdk` 项目切新分支，将修改 push 到 git 仓库
    2. `element-web` 项目切换到 develop 分支：
        1. 修改 `package.json` 中 **dependencies** `matrix-react-sdk` 的版本：`https://github.com/helium-os/matrix-react-sdk#新分支名`，例：`https://github.com/helium-os/matrix-react-sdk#users/tianhq/login`
        2. 删除 `yarn.lock` 文件和 `node_modules` 文件夹，运行 `yarn` 重新下载依赖
            - 说明：仅当 `matrix-react-sdk` **第一次切换到新分支并提交到测试环境时**执行这一步操作，后续如果还在当前分支开发时，只需将修改 push 到 git 仓库，然后在 `element-web` 项目中创建新 tag 并出包即可。
        3. 修改 `Dockerfile` 文件：`ARG REACT_SDK_BRANCH=你的分支`，例：`ARG REACT_SDK_BRANCH="users/tianhq/login"`
        4. 将这些修改 push 到 git 仓库，然后创建新 tag：`git tag xxx` 并 push 到远程仓库，触发 GitHub Actions 打包流程。
-   只修改了 `element-web` 项目时按照上面第 2 步中最后一步操作执行即可

> `element-web` 配置了 GitHub Actions 自动打包，在 `.github/workflows` 文件夹下可以查看具体配置，每次提交修改只需要创建新的 git tag 即可自动输出 docker 镜像，[在这里](https://cr.console.aliyun.com/repository/cn-shenzhen/easypay/element-web/images)可以看到镜像的版本号。
