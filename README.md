## 各端接口代理（以heliumos为例）

客户端(runProxy):

```
chat登录服务       proxy -> https://matrix.system.app.heliumos  [require cookie kc-access]
matrix服务        直接请求 https://matrix.system.service.heliumos
ipfs服务          直接请求 https://ipfs.system.service.heliumos
```

web网页端:

```
chat登录服务       proxy -> https://matrix.system.app.heliumos  [require cookie kc-access]
matrix服务        proxy -> https://matrix.system.service.heliumos
ipfs服务          proxy -> https://ipfs.system.service.heliumos
```

app端(runProxy):

```
chat登录服务       http://127.0.0.1:xxx/?origin=https://matrix.system.app.heliumos [require cookie kc-access]
matrix服务        http://127.0.0.1:xxx/?origin=https://matrix.system.service.heliumos
ipfs服务          http://127.0.0.1:xxx/?origin=https://ipfs.system.service.heliumos
```


>**Note**:<br>
> 在 src/vector/rewrite-js-sdk/fetch.ts 文件中对请求的url做了拦截，将原始url根据各端需求处理成了适配各端的url<br>


## 本地开发
本地开发有三种模式可以选择
1. 客户端模式【默认】（和客户端处理请求的逻辑保持一致）
2. web网页端模式（和web网页端处理请求的逻辑保持一致）
3. app端模式（和app网页端处理请求的逻辑保持一致）

>**Note**:<br>
> 可以在 src/matrix-react-sdk/src/utils/env.ts 中更改 devModel 变量，切换本地开发模式
> 本地开发三种模式相关代理配置可在 config/config.heliumos.ts 中查看
> 以上两点在本地开发时需要配合使用
> 本地开发模式选择客户端模式时，需要在浏览器中使用代理设置工具【如switchyOmega】配置本地代理，因为matrix服务和ipfs服务在 config/config.heliumos.ts 中没有配置代理，直接请求的原始地址，其余两种模式则不需要

