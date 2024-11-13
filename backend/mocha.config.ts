// mocha.config.js
export default {
  require: ['ts-node/register'],
  extension: ['ts', 'js'],
  spec: ['tests/**/*.test.{js,ts}'],
  timeout: 5000
};