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
        // 关闭未使用的变量报错
        "no-unused-vars": "off",
        // 允许在对象上直接调用原型上的方法
        "no-prototype-builtins": "off",
        // 不允许空块语句（catch代码块除外）
        "no-empty": ["error", { allowEmptyCatch: true }],

        // ------------@typescript-eslint/eslint-plugin
        // 关闭必须使用 ES6 样式导入或import foo = require("foo")导入
        "@typescript-eslint/no-var-requires": "off",
        // 关闭未使用的变量报错
        "@typescript-eslint/no-unused-vars": "off",
        // 允许所有@ts-<directive>的使用
        "@typescript-eslint/ban-ts-comment": "off",
        // 允许使用any
        "@typescript-eslint/no-explicit-any": "off",
        // 关闭禁用某些类型（Boolean/String/Number等）
        "@typescript-eslint/ban-types": "off",

        // ------------eslint-plugin-react
        // 关闭target="_blank"不带rel="noreferrer"属性校验
        "react/jsx-no-target-blank": "off",
        // 允许使用已弃用的方法（当前项目需要）
        "react/no-deprecated": "off",
        // 允许使用ReactDom.render()的返回值（当前项目需要）
        "react/no-render-return-value": "off",

        // ------------eslint-plugin-import
        // 允许导入未解析到的模块
        "import/no-unresolved": ["off"],
    },
};
