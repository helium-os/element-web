## 各端接口代理（以heliumos为例）

客户端(runProxy):

```
chat登录服务       proxy -> https://matrix.system.app.heliumos  [require cookie kc-access]
matrix服务        直接请求 https://matrix.system.service.heliumos
ipfs服务          直接请求 https://ipfs.system.service.heliumos
```

web网页端:

```
chat登录服务       proxy -> https://matrix.system.service.heliumos  [require cookie hos-access]
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

本地开发有两种模式可以选择
1. 客户端模式（和客户端请求处理逻辑保持一致）
2. web网页端模式（和web网页端请求处理逻辑保持一致）

