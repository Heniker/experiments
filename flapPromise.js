// this one is interesing
// it lets you `await` any amount of nested promises in an object while using only single `await`
// I probably would not use it in production as it relies on Proxies and is definitely slow as hell

var a = new Promise((res) => {
  res({
    a: new Promise((res) => res({ b: { c: { d: new Promise((res) => res({ e: 42 })) } } })),
  })
})

// so instead of `(await (await (await a).a).b.c.d).e`
// you can `await flapPromise(a).a.b.c.d.e`

const getNested = (obj, path) =>
  path.reduce(async (prev, curr) => (await prev) && (await prev)[curr], obj)

const flapPromise = (arg) => {
  const currTarget = arg
  const path = []
  let expectThenCall = false

  const proxyArgs = {
    get(target, property) {
      // console.log(`get - ${property}`)

      if (expectThenCall) {
        expectThenCall = false
        path.push('then')
      }

      if (property === 'then') {
        expectThenCall = true
      } else {
        path.push(property)
      }

      return new Proxy(() => {}, proxyArgs)
    },

    async apply(target, thisArg, argList) {
      // console.log(`apply ${target}`)

      const result = expectThenCall
        ? argList[0](getNested(currTarget, path))
        : Reflect.apply(await getNested(currTarget, path), thisArg, argList)

      expectThenCall = false
      path.length = 0
      return result
    },
  }

  return new Proxy(a, proxyArgs)
}
