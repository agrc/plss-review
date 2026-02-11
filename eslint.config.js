import { browser } from '@ugrc/eslint-config';

export default [
  {
    ignores: ['**/lib/**'],
  },
  ...browser,
];
