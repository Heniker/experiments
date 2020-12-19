const path = require('path')
const memoize = require('lodash.memoize')
const findUp = require('find-up')
const assert = require('assert')
const loaderUtils = require('loader-utils')

const betterFindUp = memoize(
  (name, cwd) => {
    return findUp(name, { cwd })
  },
  (a, b) => a + b
)

const PLUGIN_NAME = 'BetterAliasResolver'

class BetterAliasResolver {
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

            assert(pathKey && pathVal, `Invalid paths in ${filePath} folder`)

            const key = pathKey.replace('/*', '')
            const value = path.resolve(path.dirname(filePath), baseUrl, pathVal.replace('/*', ''))
            return [key, value]
          })
      )
    },
  }

  constructor(defaultAlias, options, pathToAliasMap = new Map()) {
    this.defaultAlias = defaultAlias
    this.options = Object.assign({ aliasRoots: ['tsconfig.json'] }, options)
    this.pathToAliasMap = pathToAliasMap

    this.source = 'described-resolve'
    this.target = 'resolve'
  }

  async findAlias(data) {
    let aliasesArr = await Promise.all(
      this.options.aliasRoots.map(async (it) => {
        const configRoot = await betterFindUp(it, data.path)

        if (!configRoot) {
          return false
        }

        return this.extractors[path.basename(configRoot)](configRoot)
      })
    )

    aliasesArr = aliasesArr.filter(Boolean)

    const result = {}
    aliasesArr.forEach((it) => {
      Object.assign(result, it)
    })

    return result
  }

  async updateRequest(data) {
    if (!data || !data.request || data.path.includes('node_modules')) {
      return false
    }

    const segments = data.request.split('/')

    const requestLocation = data.path.replace(/\\/g, '/') + '/'

    const alias = this.pathToAliasMap.get(requestLocation) || (await this.findAlias(data))

    if (!alias || !alias[segments[0]]) {
      return false
    }

    data.request = loaderUtils.stringifyRequest(
      this,
      alias[segments[0]] + (segments.length > 1 ? path.sep + segments.slice(1).join(path.sep) : '')
    )

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

module.exports = BetterAliasResolver
