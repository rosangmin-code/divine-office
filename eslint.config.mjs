import nextConfig from 'eslint-config-next/core-web-vitals'
import tsConfig from 'eslint-config-next/typescript'

const eslintConfig = [
  // scripts: CJS Node utilities (require()) are out of scope for the TS lint.
  //   Keep scripts/*.ts (parsers, generators) in scope.
  // public: static assets only (manifest, icons, pdf.js worker bundle).
  //   sw.js stays ignored here — its contract is covered by
  //   src/lib/__tests__/sw.test.ts instead.
  {
    ignores: [
      'scripts/**/*.js',
      'public/**',
      '.next/**',
      'node_modules/**',
    ],
  },
  ...nextConfig,
  ...tsConfig,
  // Project-wide convention: a leading underscore signals an *intentionally*
  // unused binding — the canonical shape is `const { foo: _drop, ...rest }`
  // for destructure-discard, and `(_unused, used) => …` for parameters we
  // keep only to preserve positional shape. ESLint's
  // `@typescript-eslint/no-unused-vars` defaults flag these despite the
  // convention; the explicit ignore-pattern overrides line them up with the
  // codebase style. Anything *not* `_`-prefixed is still surfaced as a
  // warning. (#497 NIT batch — replaces 8+ recurring per-line disables.)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]

export default eslintConfig
