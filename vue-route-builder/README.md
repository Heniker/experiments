This is something like **nuxt routing by pages directory**

Use it like this:

```js
const routes = [
  ...otherRoutes,
  ...buildRoutes({
    lazy: require.context('./pages', true, /.+\.vue$/, 'lazy') //or 'lazy-once',
    weak: require.context('./pages', true, /.+\.vue$/, 'weak'),
  }),
]
```
