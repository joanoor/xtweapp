const path = require('path')

const _ = require('./utils')
const config = require('./config')

const srcPath = config.srcPath

/**
 * 获取 json 路径相关信息
 */
function getJsonPathInfo (jsonPath) {
  const dirPath = path.dirname(jsonPath)
  const fileName = path.basename(jsonPath, '.json')
  const relative = path.relative(srcPath, dirPath)
  const fileBase = path.join(relative, fileName)

  return {
    dirPath, fileName, relative, fileBase
  }
}

/**
 * 检测是否包含其他自定义组件
 */
const checkProps = ['usingComponents', 'componentGenerics']
const hasCheckMap = {}
async function checkIncludedComponents (jsonPath, componentListMap) {
  const json = _.readJson(jsonPath)
  if (!json) throw new Error(`json is not valid: "${jsonPath}"`)

  const { dirPath, fileName, fileBase } = getJsonPathInfo(jsonPath)
  if (hasCheckMap[fileBase]) return
  hasCheckMap[fileBase] = true

  for (let i = 0, len = checkProps.length; i < len; i++) {
    const checkProp = checkProps[i]
    const checkPropValue = json[checkProp] || {}
    const keys = Object.keys(checkPropValue)

    for (let j = 0, jlen = keys.length; j < jlen; j++) {
      const key = keys[j]
      let value = typeof checkPropValue[key] === 'object' ? checkPropValue[key].default : checkPropValue[key]
      if (!value || typeof value === 'boolean') continue

      value = _.transformPath(value, path.sep)

      // 检查相对路径
      const componentPath = `${path.join(dirPath, value)}.json`
      const isExists = await _.checkFileExists(componentPath)
      if (isExists) {
        await checkIncludedComponents(componentPath, componentListMap)
      }
    }
  }

  const wholeFileBase = path.join(dirPath, fileName)
  let jsExt = '.js'
  const isJsFileExists = await _.checkFileExists(wholeFileBase + '.ts')
  if (isJsFileExists) {
    jsExt = '.ts'
  }

  let exists = await _.checkFileExists(path.join(dirPath, `${fileName}.wxml`))
  if (exists) {
    componentListMap.wxmlFileList.push(`${fileBase}.wxml`)
  }
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.wxss`))
  exists && componentListMap.wxssFileList.push(`${fileBase}.wxss`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.less`))
  exists && componentListMap.lessFileList.push(`${fileBase}.less`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.scss`))
  exists && componentListMap.scssFileList.push(`${fileBase}.scss`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.wxs`))
  exists && componentListMap.wxsFileList.push(`${fileBase}.wxs`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.json`))
  exists && componentListMap.jsonFileList.push(`${fileBase}.json`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.js`))
  exists && componentListMap.jsFileList.push(`${fileBase}.js`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.ts`))
  if (exists && componentListMap.tsFileList.indexOf(`${fileBase}.ts`) < 0) {
    componentListMap.tsFileList.push(`${fileBase}.ts`)
  }

  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.js`))
  exists && (componentListMap.jsFileMap[fileBase] = `${path.join(dirPath, fileName)}.js`)
  exists = await _.checkFileExists(path.join(dirPath, `${fileName}.ts`))
  exists && (componentListMap.jsFileMap[fileBase] = `${path.join(dirPath, fileName)}.ts`)
}

module.exports = async function (entry) {
  const componentListMap = {
    wxmlFileList: [],
    wxssFileList: [],
    lessFileList: [],     // NOTE:新增
    scssFileList: [],     // NOTE:新增
    wxsFileList: [],     // NOTE:新增
    jsonFileList: [],
    jsFileList: [],
    tsFileList: [],

    jsFileMap: {}, // 为 webpack entry 所用
  }

  const isExists = await _.checkFileExists(entry)
  if (!isExists) {
    const { dirPath, fileName, fileBase } = getJsonPathInfo(entry)

    const wholeFileBase = path.join(dirPath, fileName)
    let jsExt = '.js'
    const isJsFileExists = await _.checkFileExists(wholeFileBase + '.ts')
    if (isJsFileExists) {
      jsExt = '.ts'
    }
    componentListMap.jsFileList.push(`${fileBase}${jsExt}`)
    componentListMap.jsFileMap[fileBase] = `${wholeFileBase}${jsExt}`

    return componentListMap
  }

  await checkIncludedComponents(entry, componentListMap)

  return componentListMap
}