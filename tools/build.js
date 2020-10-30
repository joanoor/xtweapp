const path = require('path')
const { src, dest, task, watch, series, parallel } = require('gulp')
const clean = require('gulp-clean')
const less = require('gulp-less')
const sass = require('gulp-sass')
sass.compiler = require('node-sass')
const cleanCss = require('gulp-clean-css')
const rename = require('gulp-rename')
const gulpif = require('gulp-if')
const insert = require('gulp-insert');
const sourcemaps = require('gulp-sourcemaps')
const webpack = require('webpack')
const gulpInstall = require('gulp-install')
const config = require('./config')
const checkWxss = require('./checkwxss')
const _ = require('./utils')
const wxssConfig = config.wxss || {}
const srcPath = config.srcPath
const distPath = config.distPath
const glob = require('glob')
const typescript = require('gulp-typescript')
const tsProject = typescript.createProject('tsconfig.json', { noImplicitAny: true });

/* 拷贝文件 */
const copy = (fileList) => {
  if (!fileList.length) return false
  return src(fileList, { cwd: srcPath, base: srcPath })
    .pipe(_.logger())
    .pipe(dest(distPath))
}

/* 编译ts */
const tsCompiler = (fileList) => {
  if (!fileList.length) return false
  return src(fileList, { cwd: srcPath, base: srcPath })
    .pipe(tsProject())
    .pipe(dest(distPath))
}

/* 直接复制 */
const directCopy = (ext) => {
  return function (done) {
    const fileList = getEntry(ext)
    if (fileList && fileList.length) {
      return copy(fileList)
    }
    return done()
  }
}

/* 编译样式 */
const buildStyle = (ext) => {
  return function (done) {
    const fileList = getEntry(ext)
    if (fileList && fileList.length) {
      if (ext === 'scss') {
        return buildScss(fileList)
      } else if (ext === 'less') {
        return buildLess(fileList)
      } else if (ext === 'wxss') {
        return wxss(fileList)
      }
    }
    return done()
  }
}

/* 编译脚本 */
const buildScript = (ext) => {
  return function (done) {
    let fileList = null, tmpLength = null
    if (ext === 'js') {
      fileList = getEntry(ext, false) // false产生数组，true产生映射
    } else {
      fileList = getEntry(ext, false)
    }
    if (!Array.isArray(fileList)) {
      tmpLength = Object.keys(fileList)
      if (fileList && tmpLength.length) {
        if (ext === 'js') {
          js(fileList, this)
        } else if (ext === 'ts') {
          ts(fileList, this)
        }
      }
    } else if (Array.isArray(fileList) && fileList.length) {
      if (ext === 'js') {
        return copy(fileList)
      } else {
        return tsCompiler(fileList)
      }
    }
    return done()
  }
}

const watchFunc = (ext, id, flag) => {
  return function () {
    return watch(getEntry(ext, flag), {
      cwd: srcPath,
      base: srcPath
    }, series(`${id}-component-${ext}`))
  }
}

/* 获取资源 */
const getEntry = (ext, flag = true) => {
  const globPath = `src/**/*.${ext}`
  const pathDir = 'src(\/|\\\\)'
  const files = glob.sync(globPath)
  let entries = null
  if ((ext === 'js' || ext === 'ts') && flag) {
    entries = {}
  } else {
    entries = []
  }
  const reg = new RegExp('^' + pathDir)
  for (let i = 0; i < files.length; i++) {
    if ((ext === 'js' || ext === 'ts') && flag) {
      entries[`${path.join(files[i].replace(reg, '$`').replace(`.${ext}`, ''))}`] = path.join(srcPath, files[i].replace(reg, '$`'))
    } else {
      entries.push(path.join(files[i].replace(reg, '$`')))
    }

  }
  return entries
}

/* 获取 wxss 流 */
const wxss = (wxssFileList) => {
  if (!wxssFileList.length) return false
  return src(wxssFileList, {
    cwd: srcPath,
    base: srcPath
  })
    .pipe(checkWxss.start()) // 开始处理 import
    .pipe(checkWxss.end()) // 结束处理 import
    .pipe(cleanCss())
    .pipe(rename({
      extname: '.wxss'
    }))
    .pipe(dest(distPath))
}

/* 获取 less 流 */
const buildLess = (lessFileList) => {
  if (!lessFileList.length) return false
  return src(lessFileList, { cwd: srcPath, base: srcPath })
    // .pipe(checkWxss.start()) // 开始处理 import
    .pipe(gulpif(wxssConfig.less && wxssConfig.sourcemap, sourcemaps.init()))
    .pipe(gulpif(wxssConfig.less, less({ paths: [srcPath], compress: true })))
    // .pipe(checkWxss.end()) // 结束处理 import
    .pipe(cleanCss())
    .pipe(
      insert.transform((contents, file) => {
        if (!file.path.includes('src' + path.sep + 'common')) {
          const relativePath = path
            .relative(
              path.normalize(`${file.path}${path.sep}..`),
              config.baseCssPath
            )
            .replace(/\\/g, '/');
          contents = `@import '${relativePath}';${contents}`;
        }
        return contents;
      })
    )
    .pipe(rename({ extname: '.wxss' }))
    .pipe(gulpif(wxssConfig.less && wxssConfig.sourcemap, sourcemaps.write('./')))
    .pipe(_.logger(wxssConfig.less ? 'generate' : undefined))
    .pipe(dest(distPath))
}

/* 获取 scss 流 */
const buildScss = (scssFileList) => {
  if (!scssFileList.length) return false
  return src(scssFileList, { cwd: srcPath, base: srcPath })
    // .pipe(checkWxss.start()) // 开始处理 import
    .pipe(gulpif(wxssConfig.scss && wxssConfig.sourcemap, sourcemaps.init()))
    .pipe(gulpif(wxssConfig.scss, sass.sync().on('error', sass.logError)))
    // .pipe(checkWxss.end()) // 结束处理 import
    .pipe(cleanCss())
    .pipe(
      insert.transform((contents, file) => {
        if (!file.path.includes('src' + path.sep + 'common')) {
          const relativePath = path
            .relative(
              path.normalize(`${file.path}${path.sep}..`),
              config.baseCssPath
            )
            .replace(/\\/g, '/');
          contents = `@import '${relativePath}';${contents}`;
        }
        return contents;
      })
    )
    .pipe(rename({ extname: '.wxss' }))
    .pipe(gulpif(wxssConfig.scss && wxssConfig.sourcemap, sourcemaps.write('./')))
    .pipe(_.logger(wxssConfig.scss ? 'generate' : undefined))
    .pipe(dest(distPath))
}

/* 获取 js 流 */
const js = (jsFileMap, scope) => {
  const webpackConfig = config.webpack
  const webpackCallback = (err, stats) => {
    if (!err) {
      // eslint-disable-next-line no-console
      console.log(stats.toString({
        assets: true,
        cached: false,
        colors: true,
        children: false,
        errors: true,
        warnings: true,
        version: true,
        modules: false,
        publicPath: true,
      }))
    } else {
      // eslint-disable-next-line no-console
      console.log(err)
    }
  }
  webpackConfig.entry = jsFileMap
  webpackConfig.output.path = distPath
  console.log('======jsfilemap', jsFileMap)
  if (scope.webpackWatcher) {
    scope.webpackWatcher.close()
    scope.webpackWatcher = null
  }

  if (config.isWatch) {
    scope.webpackWatcher = webpack(webpackConfig).watch({
      ignored: /node_modules/,
    }, webpackCallback)
  } else {
    webpack(webpackConfig).run(webpackCallback)
  }
}

/* 获取 ts 流 */
const ts = (tsFileMap, scope) => {
  const webpackConfig = config.webpack
  const webpackCallback = (err, stats) => {
    if (!err) {
      // eslint-disable-next-line no-console
      console.log(stats.toString({
        assets: true,
        cached: false,
        colors: true,
        children: false,
        errors: true,
        warnings: true,
        version: true,
        modules: false,
        publicPath: true,
      }))
    } else {
      // eslint-disable-next-line no-console
      console.log(err)
    }
  }

  webpackConfig.entry = tsFileMap
  webpackConfig.output.path = distPath
  // console.log('=======log tsFileMap', tsFileMap, distPath)
  if (scope.webpackWatcherTS) {
    scope.webpackWatcherTS.close()
    scope.webpackWatcherTS = null
  }

  if (config.isWatch) {
    scope.webpackWatcherTS = webpack(webpackConfig).watch({
      ignored: /node_modules/,
    }, webpackCallback)
  } else {
    webpack(webpackConfig).run(webpackCallback)
  }
}

/* 安装依赖包 */
const install = () => {
  return series(async () => {
    const demoDist = config.demoDist
    const demoPackageJsonPath = path.join(demoDist, 'package.json')
    const packageJson = _.readJson(path.resolve(__dirname, '../package.json'))
    const dependencies = packageJson.dependencies || {}

    await _.writeFile(demoPackageJsonPath, JSON.stringify({
      dependencies
    }, null, '\t')) // write dev demo's package.json
  }, () => {
    const demoDist = config.demoDist
    const demoPackageJsonPath = path.join(demoDist, 'package.json')

    return src(demoPackageJsonPath)
      .pipe(gulpInstall({
        production: true
      }))
  })
}

class BuildTask {
  constructor(id) {
    this.id = id
    this.init()
  }

  init () {
    const id = this.id
    /* 清空目标目录 */
    task(`${id}-clean-dist`, () => src(distPath, {
      read: false,
      allowEmpty: true
    }).pipe(clean()))
    /* 拷贝 demo 到目标目录 */
    let isDemoExists = false
    task(`${id}-demo`, series(async () => {
      const demoDist = config.demoDist
      isDemoExists = await _.checkFileExists(path.join(demoDist, 'project.config.json'))
    }, done => {
      if (!isDemoExists) {
        const demoSrc = config.demoSrc
        const demoDist = config.demoDist
        return src('**/*', {
          cwd: demoSrc,
          base: demoSrc
        })
          .pipe(dest(demoDist))
      }
      return done()
    }))
    /* 安装依赖包 */
    task(`${id}-install`, install())
    /* 拷贝 json 文件到目标目录 */
    task(`${id}-component-json`, directCopy('json'))
    /* 拷贝 wxml 文件到目标目录 */
    task(`${id}-component-wxml`, directCopy('wxml'))
    /* 拷贝 wxs 文件到目标目录 */
    task(`${id}-component-wxs`, directCopy('wxs'))
    /* 生成 wxss 文件到目标目录 */
    task(`${id}-component-wxss`, buildStyle('wxss'))
    /* less 生成 wxss 文件到目标目录 */
    task(`${id}-component-less`, buildStyle('less'))
    /* scss 生成 wxss 文件到目标目录 */
    task(`${id}-component-scss`, buildStyle('scss'))
    /* 生成 js 文件到目标目录 */
    task(`${id}-component-js`, buildScript('js'))
    /* 生成 ts 文件到目标目录 */
    task(`${id}-component-ts`, buildScript('ts'))
    /* 监听 js 变化 */
    task(`${id}-watch-js`, watchFunc('js', id, false))
    /* 监听 ts 变化 */
    task(`${id}-watch-ts`, watchFunc('ts', id, false))
    /* 监听 json 变化 */
    task(`${id}-watch-json`, watchFunc('json', id))
    /* 监听 wxml 变化 */
    task(`${id}-watch-wxml`, watchFunc('wxml', id))
    /* 监听 wxss 变化 */
    task(`${id}-watch-wxss`, watchFunc('wxss', id))
    /* 监听 less 变化 */
    task(`${id}-watch-less`, watchFunc('less', id))
    /* 监听 scss 变化 */
    task(`${id}-watch-scss`, watchFunc('scss', id))
    /* 监听 demo 变化 */
    task(`${id}-watch-demo`, () => {
      const demoSrc = config.demoSrc
      const demoDist = config.demoDist
      const watchCallback = filePath => src(filePath, {
        cwd: demoSrc,
        base: demoSrc
      })
        .pipe(dest(demoDist))

      return watch('**/*', {
        cwd: demoSrc,
        base: demoSrc
      })
        .on('change', watchCallback)
        .on('add', watchCallback)
        .on('unlink', watchCallback)
    })

    /* 监听安装包列表变化 */
    task(`${id}-watch-install`, () => watch(path.resolve(__dirname, '../package.json'), install()))

    /* 构建相关任务 */
    task(`${id}-build`, series(`${id}-clean-dist`, parallel(`${id}-component-wxml`, `${id}-component-wxs`, `${id}-component-wxss`, `${id}-component-less`, `${id}-component-scss`, `${id}-component-js`, `${id}-component-ts`, `${id}-component-json`)))

    task(`${id}-watch`, series(`${id}-build`, `${id}-demo`, `${id}-install`, parallel(`${id}-watch-wxml`, `${id}-watch-wxss`, `${id}-watch-less`, `${id}-watch-scss`, `${id}-watch-js`, `${id}-watch-ts`, `${id}-watch-json`, `${id}-watch-install`, `${id}-watch-demo`)))

    task(`${id}-dev`, series(`${id}-build`, `${id}-demo`, `${id}-install`))

    task(`${id}-default`, series(`${id}-build`))
  }
}

module.exports = BuildTask
