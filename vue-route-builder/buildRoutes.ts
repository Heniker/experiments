import set from 'lodash.set'

const getParsedPaths = (context) => {
  const paths = context.weak.keys()
  const result = {}

  paths.forEach((it) => {
    const segments = it
      .replace(/\.vue$/g, '')
      .slice(2)
      .split('/')

    set(result, segments, {
      name: context.weak.resolve(it),
      component: () => context.lazy(it),
    })
  })
  return result
}

const recursiveBuildRoutes = (
  currentVal: Record<string, any>,
  result: import('vue-router').RouteConfig[],
  currentPath: string
) => {
  let parent: import('vue-router').RouteConfig = { path: '' }

  if (currentVal.index) {
    parent = currentVal.index
    parent.path = currentPath
    result.push(parent)
    delete currentVal.index
  }

  if (currentVal._children) {
    parent.children = parent.children || []

    delete parent.name

    recursiveBuildRoutes(currentVal._children, parent.children, '')

    delete currentVal._children
  }

  Object.entries(currentVal).forEach(([key, val]) => {
    if (val.index) {
      recursiveBuildRoutes(val, result, `${currentPath + key}/`)
    } else {
      val.path = key
      result.push(val)
    }
  })

  return result
}

export function buildRoutes(context: {
  weak: __WebpackModuleApi.RequireContext
  lazy: __WebpackModuleApi.RequireContext
}) {
  const result = recursiveBuildRoutes(getParsedPaths(context), [], '/')

  return result
}
