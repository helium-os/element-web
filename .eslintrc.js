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
    plugins: ["@typescript-eslint", "import", "react", "react-hooks"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended", // eslint-config-prettier
    ],
    rules: {
        // 关闭禁止使用未声明的变量
        "no-unused-vars": "off",
        // 允许在对象上直接调用原型上的方法
        "no-prototype-builtins": "off",
        // 不允许空块语句（catch代码块除外）
        "no-empty": ["error", { allowEmptyCatch: true }],

        // ------------@typescript-eslint
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-explicit-any": "off",
        // 关闭禁用某些类型
        "@typescript-eslint/ban-types": "off",

        // ------------eslint-plugin-react
        // 大括号内的换行符
        // "react/jsx-curly-newline": ["error", { multiline: "require", singleline: "consistent" }],
        // 大括号内的空格
        // "react/jsx-curly-spacing": ["error", { when: "never", children: { when: "always" } }],
        // 禁止target="_blank"不带rel="noreferrer"属性
        "react/jsx-no-target-blank": "off",
        // 允许使用已弃用的方法（当前项目需要）
        "react/no-deprecated": "off",
        // 允许使用ReactDom.render()的返回值（当前项目需要）
        "react/no-render-return-value": "off",

        // ------------eslint-plugin-import
        "import/no-unresolved": ["off"],
    },
};
