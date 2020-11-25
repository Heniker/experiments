import get from 'lodash.get'
import set from 'lodash.set'

const traverseBack = (str: string) => {
  return str.replace(/[^.]+(?=$)/g, '').slice(0, -1)
}

// lodash we deserve:
const last = (arr: any[]) => arr[arr.length - 1]

const tap = (arg: any, fn: (arg: any) => void) => {
  fn(arg)
  return arg
}

const flow = (...arg) => {
  return (acc) => arg.reduce((val, fn) => fn(val), acc)
}

export function buildRoutes(
  context: {
    weak: __WebpackModuleApi.RequireContext
    lazy: __WebpackModuleApi.RequireContext
  },
  { childrenFolder = '_children' }: { childrenFolder?: string } = {}
) {
  const paths = context.weak.keys()

  const keysObj: Record<string, Partial<import('vue-router').RouteConfig>> = {}

  paths.forEach((it, i) => {
    const str = traverseBack(
      it
        .replace(/^\./, '')
        .replace(/@/g, ':')
        .replace(/(?<!^)\/$/g, '')
        .replace(new RegExp(`(${childrenFolder})/`, 'g'), `.children.[${i}].`)
        .replace('index', '')
    )

    set(
      keysObj,
      str,
      Object.assign(get(keysObj, str) || {}, {
        component: () => context.lazy(it).then((it) => it.default),
        name: last(str.split('.')) === '/' ? undefined : context.weak.resolve(it),
        path: last(str.split('.')),
      })
    )

    if (str.includes('children')) {
      set(keysObj, traverseBack(str), get(keysObj, str))
      tap(get(keysObj, flow(traverseBack, traverseBack, traverseBack), str), (arg) => {
        if (arg.children) {
          arg.children = arg.children.filter(Boolean)
        }
      })
    }
  })

  return Object.entries(keysObj).map(([key, val]) => Object.assign(val, { path: key }))
}
