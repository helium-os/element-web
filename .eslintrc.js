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
        // // 取消函数参数需要重新赋值给另一个变量才能使用
        // 'no-param-reassign': ['off'],
        // // 取消 { a, b, c } 多个变量需要换行
        // 'object-curly-newline': ['off'],
        // // 禁用var，用let和const代替
        // 'no-var': 'error',
        // // 强制全等( === 和 !==)
        // eqeqeq: 'error',
        // // 函数名称或function关键字与左括号之间不允许有空格
        // 'space-before-function-paren': ['error', 'never'],
        // // 箭头函数，箭头前后空格
        // 'arrow-spacing': ['error', { before: true, after: true }],
        // 'padding-line-between-statements': ['error', {
        //     blankLine: 'always', prev: '*', next: 'return'  // return 之前加空行
        // }],
        //
        // // react配置
        // // 非空标签和自关闭标签闭合标记必须与开始标记对齐
        // 'react/jsx-closing-bracket-location': ['error', {
        //     "nonEmpty": 'line-aligned',
        //     "selfClosing": 'line-aligned'
        // }],
        // 大括号内的换行符
        // "react/jsx-curly-newline": ["error", { multiline: "require", singleline: "require" }],
        // // 当多行时，每一行的最多props个数为1
        // "react/jsx-max-props-per-line": ['error', { when: "multiline", maximum: 1 }],
        // 禁止target="_blank"不带rel="noreferrer"属性
        "react/jsx-no-target-blank": ["off"],
        // "react/jsx-wrap-multilines": ['error', {
        //     "declaration": "parens-new-line",
        //     "assignment": "parens-new-line",
        //     "return": "parens-new-line",
        //     "arrow": "parens-new-line",
        //     "condition": "parens-new-line",
        //     "logical": "parens-new-line",
        //     "prop": "parens-new-line"
        // }],
        // // 强制组件方法顺序
        // 'react/sort-comp': ['off'],
        // // 结束标签，组件省略闭合标签，html不省略闭合标签
        // 'react/self-closing-comp': ['error', { component: true, html: false }],
        //
        // // 禁止出现未使用的变量
        // '@typescript-eslint/no-unused-vars': ['off'],
        "import/no-unresolved": ["off"],
    },
};
