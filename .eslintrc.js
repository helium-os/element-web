module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: "detect",
        },
    },
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended", // eslint-config-prettier
    ],
    rules: {
        // 提醒有未使用的变量
        "no-unused-vars": "warn",
        // 允许在对象上直接调用原型上的方法
        "no-prototype-builtins": "off",
        // 不允许空块语句（catch代码块除外）
        "no-empty": ["error", { allowEmptyCatch: true }],

        // ------------@typescript-eslint/eslint-plugin
        // 关闭必须使用 ES6 样式导入或import foo = require("foo")导入
        "@typescript-eslint/no-var-requires": "off",
        // 提醒有未使用的变量
        "@typescript-eslint/no-unused-vars": "warn",
        // 允许所有@ts-<directive>的使用
        "@typescript-eslint/ban-ts-comment": "off",
        // 允许使用any
        "@typescript-eslint/no-explicit-any": "off",
        // 提醒禁用某些类型（Boolean/String/Number等）
        "@typescript-eslint/ban-types": "warn",

        // ------------eslint-plugin-react
        // 关闭target="_blank"不带rel="noreferrer"属性校验
        "react/jsx-no-target-blank": "off",
        // 提醒使用了已弃用的方法（当前项目需要）
        "react/no-deprecated": "warn",
        // 提醒使用了ReactDom.render()的返回值（当前项目需要）
        "react/no-render-return-value": "warn",
        // 提醒使用了findDOMNode方法（当前项目需要）
        "react/no-find-dom-node": "warn",
        // 提醒使用了字符串 ref
        "react/no-string-refs": "warn",
        "react/display-name": "warn",

        // ------------eslint-plugin-import
        // 提醒导入了未解析到的模块
        "import/no-unresolved": "warn",
        // 提醒导入了未命名导出的变量
        "import/named": "warn",
    },
};
