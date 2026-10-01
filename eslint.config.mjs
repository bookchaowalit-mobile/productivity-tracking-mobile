import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'platforms', 'hooks', 'webpack.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
