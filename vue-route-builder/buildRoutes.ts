import get from 'lodash.get'
import set from 'lodash.set'

const traverseBack = (str: string) => {
  return str.replace(/[^.]+(?=$)/g, '').slice(0, -1)
}

const last = (arr: any[]) => arr[arr.length - 1]

const tap = (arg: any, fn: (arg: any) => void) => {
  fn(arg)
}

export function buildRoutes(
  weakContext: __WebpackModuleApi.RequireContext,
  lazyContext: __WebpackModuleApi.RequireContext
) {
  const paths = weakContext.keys()

  const keysObj: Record<string, Partial<import('vue-router').RouteConfig>> = {}

  paths.forEach((it, i) => {
    const str = traverseBack(
      it
        .replace(/(?<!^)\/$/g, '')
        .replace(/(_children)\//g, `.children.[${i}].`)
        .replace('index', '')
    )

    set(
      keysObj,
      str,
      Object.assign(get(keysObj, str) || {}, {
        component: () => lazyContext(it).then(it => it.default),
        name: last(str.split('.')) === '/' ? undefined : weakContext.resolve(it),
        path: last(str.split('.')),
      })
    )

    if (str.includes('children')) {
      set(keysObj, traverseBack(str), get(keysObj, str))
      tap(get(keysObj, traverseBack(traverseBack(traverseBack(str)))), arg => {
        if (arg.children) {
          arg.children = arg.children.filter(Boolean)
        }
      })
    }
  })

  return Object.entries(keysObj).map(([key, val]) => Object.assign(val, { path: key }))
}
