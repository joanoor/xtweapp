const path = require('path')
const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')
const isDev = process.argv.indexOf('--develop') >= 0
const isWatch = process.argv.indexOf('--watch') >= 0
const demoSrc = path.resolve(__dirname, './demo')
const demoDist = path.resolve(__dirname, '../miniprogram_dev')
const src = path.resolve(__dirname, '../src')
const baseCssPath = path.resolve(__dirname, '../src/common/main.wxss');
const dev = path.join(demoDist, 'components')
const dist = path.resolve(__dirname, '../miniprogram_dist')

module.exports = {
  isDev,
  isWatch,
  srcPath: src, // 源目录
  distPath: isDev ? dev : dist, // 目标目录
  demoSrc, // demo 源目录
  demoDist, // demo 目标目录
  baseCssPath,

  wxss: {
    less: false, // 使用 less 来编写 wxss
    scss: true, // 使用 scss 来编写 wxss
    sourcemap: false, // 生成 scss sourcemap
  },

  js: {
    webpack: true, // 使用 webpack 来构建 js
    sourcemap: false,
  },

  webpack: {
    mode: 'production',
    output: {
      filename: '[name].js',
      // libraryTarget: 'commonjs2',
    },
    target: 'node',
    externals: [nodeExternals()], // 忽略 node_modules
    module: {
      rules: [{
        test: /\.js|\.ts$/i,
        use: [
          'babel-loader'
        ],
        exclude: /node_modules/
      }],
    },
    resolve: {
      modules: [src, 'node_modules'],
      extensions: ['.ts', '.js', '.json'],
    },
    plugins: [
      new webpack.DefinePlugin({}),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1
      }),
    ],
    optimization: {
      minimize: false,
    },
    // devtool: 'source-map', // 生成 js sourcemap
    performance: {
      hints: 'warning',
      assetFilter: assetFilename => assetFilename.endsWith('.js')
    }
  },

  copy: [], // 将会复制到目标目录

}
