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
]

export default eslintConfig
