# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

## Starting the project
- make sure you are on the latest node and npm version 
- npm install after pulling code
- npm run dev
- press o and it will open it in a new window


- Instructions: https://www.bezkoder.com/react-hooks-redux-login-registration-example/
- Video: https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjmtZXvj9uCAxWwHDQIHbcqCcIQwqsBegQICBAG&url=https%3A%2F%2Fm.youtube.com%2Fwatch%3Fv%3D-JJFQ9bkUbo%26pp%3DygUNI3Rva2VucmVmcmVzaA%253D%253D&usg=AOvVaw1lzrNCimOLszl9g-2yF5Ok&opi=89978449
- Another Instructions: https://developer.okta.com/blog/2022/08/29/react-typescript-redux

