module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    env: {
        'browser': true,
        'es2021': true,
        'node': true
    },
    extends: [
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended', // eslint-config-prettier
    ],
    overrides: [
        {
            'env': {
                'node': true
            },
            'files': [
                '.eslintrc.{js,cjs}'
            ],
            'parserOptions': {
                'sourceType': 'script'
            }
        }
    ],
    parserOptions: {
        'ecmaVersion': 'latest',
        'sourceType': 'module',
        'ecmaFeatures': {
            'jsx': true
        }
    },
    plugins: [
        'react',
        'react-hooks',
        '@typescript-eslint'
    ],
    rules: {
        // 取消函数参数需要重新赋值给另一个变量才能使用
        'no-param-reassign': ['off'],
        // 取消 { a, b, c } 多个变量需要换行
        'object-curly-newline': ['off'],

        // 禁用var，用let和const代替
        'no-var': 'error',
        // 强制全等( === 和 !==)
        'eqeqeq': 'error',
        // 禁止出现未使用的变量
        '@typescript-eslint/no-unused-vars': ['error'],
        // 箭头函数，箭头前后空格
        'arrow-spacing': ['error', { before: true, after: true }],
        // 文件末尾强制换行
        // 'eol-last': 'error',

        // react配置
        // 强制组件方法顺序
        'react/sort-comp': ['off'],
        // 结束标签，组件省略闭合标签，html不省略闭合标签
        'react/self-closing-comp': ['error', { 'component': true, 'html': false }],
        // 检查 Hook 的规则，不允许在if for里面使用
        'react-hooks/rules-of-hooks': ['error'],
        // 检查 effect 的依赖
        'react-hooks/exhaustive-deps': ['error']
    }
}
