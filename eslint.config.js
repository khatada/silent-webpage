import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'pixi.js',
          importNames: ['Graphics', 'GraphicsContext'],
          message: 'ピクセルアートの原画はimagegenで制作し、採用済み画像をSpriteで表示してください。',
        }],
      }],
    },
  },
);
