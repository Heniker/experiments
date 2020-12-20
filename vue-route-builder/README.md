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

It also adds webpack IDs to your routes as name, so you can literally reference your component to do the navigation:

```js
$router.push({name: require.resolve('@/pages/_children')}) // will resolve to @/pages/_children/index.vue
```

Example file structure and what routes it will create
```
├───pages
│   │   index.vue --> '/'
│   │
│   ├───foo
│   │   │   index.vue --> '/foo'
│   │   │
│   │   └───bar
│   │           index.vue --> '/foo/bar'
│   │
│   ├───register
│   │   │   index.vue --> '/register'
│   │   │
│   │   └───_children --> '/register' children
│   │           step1.vue
│   │           step2.vue
│   │
│   └───_children --> '/' children
│           index.vue
│           transfers.vue
```