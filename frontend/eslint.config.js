"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_1 = __importDefault(require("@eslint/js"));
const globals_1 = __importDefault(require("globals"));
const eslint_plugin_react_hooks_1 = __importDefault(require("eslint-plugin-react-hooks"));
const eslint_plugin_react_refresh_1 = __importDefault(require("eslint-plugin-react-refresh"));
const typescript_eslint_1 = __importDefault(require("typescript-eslint"));
exports.default = typescript_eslint_1.default.config({ ignores: ['dist'] }, {
    extends: [js_1.default.configs.recommended, ...typescript_eslint_1.default.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
        ecmaVersion: 2020,
        globals: globals_1.default.browser,
    },
    plugins: {
        'react-hooks': eslint_plugin_react_hooks_1.default,
        'react-refresh': eslint_plugin_react_refresh_1.default,
    },
    rules: {
        ...eslint_plugin_react_hooks_1.default.configs.recommended.rules,
        'react-refresh/only-export-components': [
            'warn',
            { allowConstantExport: true },
        ],
    },
});
