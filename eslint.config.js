// @ts-nocheck
const { defineConfig } = require('eslint/config');
const nativeConfig = require('eslint-config-universe/flat/native.js');
const nodeConfig = require('eslint-config-universe/flat/node.js');

module.exports = (async () => {
  const astro = (await import('eslint-plugin-astro')).default;
  return defineConfig([
    {
      ignores: [
        '.sst/**',
        '**/dist/**',
        '**/build/**',
        '**/web-build/**',
        '**/android/**',
        '**/.expo/**',
        '**/.astro/**',
      ],
    },
    { extends: [nodeConfig] },
    {
      files: ['packages/client/**/*.{js,jsx,ts,tsx}'],
      extends: [nativeConfig],
      // react-hooks@7 ships React Compiler rules; project does not use the compiler
      // they false-positive on Reanimated shared values and intentional ref/effect patterns
      rules: {
        'react-hooks/immutability': 'off',
        'react-hooks/refs': 'off',
        'react-hooks/set-state-in-effect': 'off',
        'react-hooks/purity': 'off',
      },
    },
    {
      files: ['packages/website/**/*.astro'],
      extends: [astro.configs['flat/recommended']],
    },
  ]);
})();
