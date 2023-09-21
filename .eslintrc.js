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
        // 函数括号前的空格
        "space-before-function-paren": [
            "error",
            {
                anonymous: "never", // 匿名函数不需要空格
                named: "never", // 命名函数不需要空格
                asyncArrow: "always", // 箭头函数需要空格
            },
        ],
        // eslint-plugin-react
        // 大括号内的换行符
        // "react/jsx-curly-newline": ["error", { multiline: "require", singleline: "consistent" }],
        // 大括号内的空格
        "react/jsx-curly-spacing": ["error", { when: "never", children: { when: "always" } }],
        // 禁止target="_blank"不带rel="noreferrer"属性
        "react/jsx-no-target-blank": ["off"],
        // eslint-plugin-import
        "import/no-unresolved": ["off"],
    },
};
