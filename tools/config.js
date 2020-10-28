const path = require('path')

// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack')
// eslint-disable-next-line import/no-extraneous-dependencies
const nodeExternals = require('webpack-node-externals')

const isDev = process.argv.indexOf('--develop') >= 0
const isWatch = process.argv.indexOf('--watch') >= 0
const demoSrc = path.resolve(__dirname, './demo')
const demoDist = path.resolve(__dirname, '../miniprogram_dev')
const src = path.resolve(__dirname, '../src')
const baseCssPath = path.resolve(__dirname, '../src/common/main.wxss');
const dev = path.join(demoDist, 'components')
const dist = path.resolve(__dirname, '../miniprogram_dist')


const glob = require('glob')

const getEntry = () => {
  const globPath = 'src/**/*.js' // 匹配src目录下的所有文件夹中的html文件
  // (\/|\\\\) 这种写法是为了兼容 windows和 mac系统目录路径的不同写法
  const pathDir = 'src(\/|\\\\)' // 路径为src目录下的所有文件夹
  const files = glob.sync(globPath)
  const entries = []
  const reg = new RegExp('^' + pathDir)
  for (let i = 0; i < files.length; i++) {
    entries.push(files[i].replace(reg, '$`').replace('.js', ''))
  }
  return entries
}

module.exports = {
  // entry: ['index', 'lib'],
  // entry: ['vertification/vertification', 'sms/sms'],
  entry: getEntry(),

  isDev,
  isWatch,
  srcPath: src, // 源目录
  distPath: isDev ? dev : dist, // 目标目录

  demoSrc, // demo 源目录
  demoDist, // demo 目标目录

  baseCssPath,

  wxss: {
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
      libraryTarget: 'commonjs2',
    },
    target: 'node',
    externals: [nodeExternals()], // 忽略 node_modules
    module: {
      rules: [{
        test: /\.js|\.ts$/i,
        use: [
          'babel-loader',
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
