module.exports = {
    plugins: ["matrix-org"],
    extends: ["plugin:matrix-org/babel", "plugin:matrix-org/react", "plugin:matrix-org/a11y"],
    parserOptions: {
        project: ["./tsconfig.json"],
    },
    env: {
        browser: true,
        node: true,
    },
    globals: {
        LANGUAGES_FILE: "readonly",
    },
    rules: {
        // Things we do that break the ideal style
        "quotes": "off",

        // matrix-react-sdk
        // Things we do that break the ideal style
        "no-constant-condition": "off",
        "prefer-promise-reject-errors": "off",
        "no-async-promise-executor": "off",
        "no-extra-boolean-cast": "off",

        // Bind or arrow functions in props causes performance issues (but we
        // currently use them in some places).
        // It's disabled here, but we should using it sparingly.
        "react/jsx-no-bind": "off",
        "react/jsx-key": ["error"],

        "no-restricted-properties": [
            "error",
            ...buildRestrictedPropertiesOptions(
                ["window.innerHeight", "window.innerWidth", "window.visualViewport"],
                "Use UIStore to access window dimensions instead.",
            ),
            ...buildRestrictedPropertiesOptions(
                ["*.mxcUrlToHttp", "*.getHttpUriForMxc"],
                "Use Media helper instead to centralise access for customisation.",
            ),
        ],

        // Ban matrix-js-sdk/src imports in favour of matrix-js-sdk/src/matrix imports to prevent unleashing hell.
        "no-restricted-imports": [
            "error",
            {
                paths: [
                    {
                        name: "matrix-js-sdk",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src/",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-js-sdk/src/index",
                        message: "Please use matrix-js-sdk/src/matrix instead",
                    },
                    {
                        name: "matrix-react-sdk",
                        message: "Please use matrix-react-sdk/src/index instead",
                    },
                    {
                        name: "matrix-react-sdk/",
                        message: "Please use matrix-react-sdk/src/index instead",
                    },
                ],
                patterns: [
                    {
                        group: ["matrix-js-sdk/lib", "matrix-js-sdk/lib/", "matrix-js-sdk/lib/**"],
                        message: "Please use matrix-js-sdk/src/* instead",
                    },
                ],
            },
        ],

        // There are too many a11y violations to fix at once
        // Turn violated rules off until they are fixed
        "jsx-a11y/aria-activedescendant-has-tabindex": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "jsx-a11y/media-has-caption": "off",
        "jsx-a11y/mouse-events-have-key-events": "off",
        "jsx-a11y/no-autofocus": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
        "jsx-a11y/no-noninteractive-tabindex": "off",
        "jsx-a11y/no-static-element-interactions": "off",
        "jsx-a11y/role-supports-aria-props": "off",
        "jsx-a11y/tabindex-no-positive": "off",

        "matrix-org/require-copyright-header": "error",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
    overrides: [
        {
            files: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
            extends: ["plugin:matrix-org/typescript", "plugin:matrix-org/react"],
            // NOTE: These rules are frozen and new rules should not be added here.
            // New changes belong in https://github.com/matrix-org/eslint-plugin-matrix-org/
            rules: {
                // Things we do that break the ideal style
                "prefer-promise-reject-errors": "off",
                "quotes": "off",

                // We disable this while we're transitioning
                "@typescript-eslint/no-explicit-any": "off",
                // We're okay with assertion errors when we ask for them
                "@typescript-eslint/no-non-null-assertion": "off",

                // Ban matrix-js-sdk/src imports in favour of matrix-js-sdk/src/matrix imports to prevent unleashing hell.
                "no-restricted-imports": [
                    "error",
                    {
                        paths: [
                            {
                                name: "matrix-js-sdk",
                                message: "Please use matrix-js-sdk/src/matrix instead",
                            },
                            {
                                name: "matrix-js-sdk/",
                                message: "Please use matrix-js-sdk/src/matrix instead",
                            },
                            {
                                name: "matrix-js-sdk/src",
                                message: "Please use matrix-js-sdk/src/matrix instead",
                            },
                            {
                                name: "matrix-js-sdk/src/",
                                message: "Please use matrix-js-sdk/src/matrix instead",
                            },
                            {
                                name: "matrix-js-sdk/src/index",
                                message: "Please use matrix-js-sdk/src/matrix instead",
                            },
                            {
                                name: "matrix-react-sdk",
                                message: "Please use matrix-react-sdk/src/index instead",
                            },
                            {
                                name: "matrix-react-sdk/",
                                message: "Please use matrix-react-sdk/src/index instead",
                            },
                        ],
                        patterns: [
                            {
                                group: ["matrix-js-sdk/lib", "matrix-js-sdk/lib/", "matrix-js-sdk/lib/**"],
                                message: "Please use matrix-js-sdk/src/* instead",
                            },
                            {
                                group: ["matrix-react-sdk/lib", "matrix-react-sdk/lib/", "matrix-react-sdk/lib/**"],
                                message: "Please use matrix-react-sdk/src/* instead",
                            },
                        ],
                    },
                ],
            },
        },
        {
            files: ["test/**/*.{ts,tsx}"],
            rules: {
                // We don't need super strict typing in test utilities
                "@typescript-eslint/explicit-function-return-type": "off",
                "@typescript-eslint/explicit-member-accessibility": "off",
            },
        },

        // matrix-react-sdk
        {
            files: ["src/matrix-react-sdk/src/**/*.{ts,tsx}", "src/matrix-react-sdk/test/**/*.{ts,tsx}", "src/matrix-react-sdk/cypress/**/*.ts"],
            extends: ["plugin:matrix-org/typescript", "plugin:matrix-org/react"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": [
                    "error",
                    {
                        allowExpressions: true,
                    },
                ],

                // Things we do that break the ideal style
                "prefer-promise-reject-errors": "off",
                "no-extra-boolean-cast": "off",

                // Remove Babel things manually due to override limitations
                "@babel/no-invalid-this": ["off"],

                // We're okay being explicit at the moment
                "@typescript-eslint/no-empty-interface": "off",
                // We disable this while we're transitioning
                "@typescript-eslint/no-explicit-any": "off",
                // We'd rather not do this but we do
                "@typescript-eslint/ban-ts-comment": "off",
                // We're okay with assertion errors when we ask for them
                "@typescript-eslint/no-non-null-assertion": "off",
            },
        },
        // temporary override for offending icon require files
        {
            files: [
                "src/matrix-react-sdk/src/SdkConfig.ts",
                "src/matrix-react-sdk/src/components/structures/FileDropTarget.tsx",
                "src/matrix-react-sdk/src/components/structures/RoomStatusBar.tsx",
                "src/matrix-react-sdk/src/components/structures/UserMenu.tsx",
                "src/matrix-react-sdk/src/components/views/avatars/WidgetAvatar.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/AddExistingToSpaceDialog.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/ForwardDialog.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/InviteDialog.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/ModalWidgetDialog.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/UploadConfirmDialog.tsx",
                "src/matrix-react-sdk/src/components/views/dialogs/security/SetupEncryptionDialog.tsx",
                "src/matrix-react-sdk/src/components/views/elements/AddressTile.tsx",
                "src/matrix-react-sdk/src/components/views/elements/AppWarning.tsx",
                "src/matrix-react-sdk/src/components/views/elements/SSOButtons.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MAudioBody.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MImageBody.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MFileBody.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MStickerBody.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MVideoBody.tsx",
                "src/matrix-react-sdk/src/components/views/messages/MVoiceMessageBody.tsx",
                "src/matrix-react-sdk/src/components/views/right_panel/EncryptionPanel.tsx",
                "src/matrix-react-sdk/src/components/views/rooms/EntityTile.tsx",
                "src/matrix-react-sdk/src/components/views/rooms/LinkPreviewGroup.tsx",
                "src/matrix-react-sdk/src/components/views/rooms/MemberList.tsx",
                "src/matrix-react-sdk/src/components/views/rooms/MessageComposer.tsx",
                "src/matrix-react-sdk/src/components/views/rooms/ReplyPreview.tsx",
                "src/matrix-react-sdk/src/components/views/settings/tabs/room/SecurityRoomSettingsTab.tsx",
                "src/matrix-react-sdk/src/components/views/settings/tabs/user/GeneralUserSettingsTab.tsx",
            ],
            rules: {
                "@typescript-eslint/no-var-requires": "off",
            },
        },
        {
            files: ["src/matrix-react-sdk/test/**/*.{ts,tsx}", "src/matrix-react-sdk/cypress/**/*.ts"],
            extends: ["plugin:matrix-org/jest"],
            rules: {
                // We don't need super strict typing in test utilities
                "@typescript-eslint/explicit-function-return-type": "off",
                "@typescript-eslint/explicit-member-accessibility": "off",

                // Jest/Cypress specific

                // Disabled tests are a reality for now but as soon as all of the xits are
                // eliminated, we should enforce this.
                "jest/no-disabled-tests": "off",
                // TODO: There are many tests with invalid expects that should be fixed,
                // https://github.com/vector-im/element-web/issues/24709
                "jest/valid-expect": "off",
                // Also treat "oldBackendOnly" as a test function.
                // Used in some crypto tests.
                "jest/no-standalone-expect": [
                    "error",
                    {
                        additionalTestBlockFunctions: ["beforeAll", "beforeEach", "oldBackendOnly"],
                    },
                ],
            },
        },
        {
            files: ["src/matrix-react-sdk/cypress/**/*.ts"],
            parserOptions: {
                project: ["./src/matrix-react-sdk/cypress/tsconfig.json"],
            },
            rules: {
                // Cypress "promises" work differently - disable some related rules
                "jest/valid-expect-in-promise": "off",
                "jest/no-done-callback": "off",
            },
        },
    ],
};

function buildRestrictedPropertiesOptions(properties, message) {
    return properties.map((prop) => {
        let [object, property] = prop.split(".");
        if (object === "*") {
            object = undefined;
        }
        return {
            object,
            property,
            message,
        };
    });
}
