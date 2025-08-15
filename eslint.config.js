import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('react-app'),
  ...compat.extends('react-app/jest'),
  prettierConfig,
];
