module.exports = {
  root: true,
  extends: 'universe/node',
  ignorePatterns: [
    '.sst/**',
    'packages/website/.cache/**',
    'packages/website/public/**',
    '**/dist/**',
    '**/build/**',
    '**/.expo/**',
  ],
  overrides: [
    {
      files: ['packages/client/**/*.{js,jsx,ts,tsx}'],
      extends: 'universe/native',
    },
    {
      files: ['packages/website/**/*.{js,jsx,ts,tsx}'],
      extends: 'universe/web',
    },
  ],
};
