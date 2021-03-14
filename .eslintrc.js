module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-undef": "off",
        "no-extra-parens": [
            "error"
        ],
        "curly": [
            "error",
            "all"
        ],
        "brace-style": [
            "error",
            "1tbs"
        ],
        "no-prototype-builtins": [
            "off"
        ],
        "no-trailing-spaces": [
            "error"
        ],
        "operator-linebreak": [
            "error",
            "after",
            { "overrides": { "?": "before", ":": "before" } }
        ]
    }
};
