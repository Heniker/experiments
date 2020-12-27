const path = require('path')
const memoize = require('lodash.memoize')
const findUp = require('find-up')
const assert = require('assert')

const memoizeFindUp = memoize(
  (name, cwd) => findUp(name, { cwd }),
  (...arg) => arg.join('')
)

const betterFindUp = async (name, cwd) => {
  const matchingFiles = []

  let currentDir = cwd

  while (true) {
    const filePath = await memoizeFindUp(name, currentDir)

    if (!filePath) {
      return matchingFiles
    }

    matchingFiles.push(filePath)
    currentDir = path.dirname(path.dirname(filePath))
  }
}

const PLUGIN_NAME = 'DirectoryBasedPlugin'

class DirectoryBasedPlugin {
  extractors = {
    'tsconfig.json': (filePath) => {
      const tsconfig = require(filePath)

      const { paths, baseUrl } = tsconfig.compilerOptions || {}

      if (!baseUrl || !paths) {
        return {}
      }

      return Object.fromEntries(
        Object.entries(paths)
          .filter(([pathKey, pathValues]) => {
            if (pathValues.length !== 1) {
              console.warn(
                `${PLUGIN_NAME}: tsconfig.json extractor: Multiple paths are not supported. Ignoring key - ${pathKey}`
              )

              return false
            }

            return true
          })
          .map(([pathKey, pathValues]) => {
            const pathVal = pathValues[0]

            assert(
              pathKey && pathVal,
              `${PLUGIN_NAME}: tsconfig.json extractor: Invalid paths in ${filePath} folder`
            )

            const key = pathKey.replace('/*', '')
            const value = path.resolve(path.dirname(filePath), baseUrl, pathVal.replace('/*', ''))
            return [key, value]
          })
      )
    },
  }

  constructor(defaultAlias, options, pathToAliasMap = new Map()) {
    this.defaultAlias = defaultAlias
    this.options = Object.assign(
      { aliasRoots: ['tsconfig.json'], ignore: ['node_modules'] },
      options
    )
    this.pathToAliasMap = pathToAliasMap

    this.source = 'described-resolve'
    this.target = 'resolve'
  }

  async findAlias(data) {
    let aliasesArr = await Promise.all(
      this.options.aliasRoots.map(async (it) => {
        const configRoots = await betterFindUp(it, data.path)

        return configRoots.map((it) => {
          if (!it || !this.extractors[path.basename(it)]) {
            return false
          }

          return this.extractors[path.basename(it)](it)
        })
      })
    )

    aliasesArr = aliasesArr.flat().filter(Boolean)

    const result = {}
    aliasesArr.forEach((it) => {
      Object.assign(result, it)
    })

    return result
  }

  async updateRequest(data) {
    if (!data || !data.request || this.options.ignore.find((it) => data.path.includes(it))) {
      return false
    }

    const requestSegements = data.request.split('/')

    const requestLocation = data.path.replace(/\\/g, '/') + '/'

    const rootAlias = this.pathToAliasMap.get(requestLocation) || (await this.findAlias(data))
    const alias = Object.assign({}, this.defaultAlias, rootAlias || {})

    if (!alias[requestSegements[0]]) {
      return false
    }

    data.request =
      alias[requestSegements[0]] +
      (requestSegements.length > 1 ? path.sep + requestSegements.slice(1).join(path.sep) : '')

    return true
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target)
    resolver.getHook(this.source).tapAsync(PLUGIN_NAME, async (data, resolveContext, callback) => {
      if (await this.updateRequest(data)) {
        resolver.doResolve(target, data, null, resolveContext, callback)
        return
      }
      callback()
    })
  }
}

module.exports = DirectoryBasedPlugin
