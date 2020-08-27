const isTestEnv = process.env.NODE_ENV === 'test'

module.exports = {
  presets: [
    ['@babel/preset-env', { modules: isTestEnv ? 'commonjs' : false }],
    ['@babel/preset-typescript'],
  ],
}
