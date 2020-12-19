# Directory based webpack alias

So I stumbled across webpack limitation that it doesn't allow you to create aliases for specific folder.

For example, imagine you have 2 entry points, _A_ and _B_ in your webpack config which are basicly separate projects. They do not import anything from each other, but they share some files in `common` folder (standard real life monorepo structure).

If you use aliases you might find it natural to use `@` symbol to reference the root of your project. But you can't specify `@` to mean project _A_ root and project _B_ root at the same time depending on where it refernced from in a single config file.

So basicly this plugin allows you to do just that. As a bonus it also extracts all aliases from the nearest `tsconfig.json` file and if you use typescript it may work for you with zero configuration.

Example creating aliases for specific glob pattern:

```js
const glob = require('glob')

new MyResolverPlugin(
  {},
  {},
  new Map([
    ...glob
      .sync(`${project1Config.projectPath}/**/`, { ignore: '**/node_modules/**' })
      .map((it) => [it, {@: project1Config.projectPath}]),
    ...glob
      .sync(`${project2Config.projectPath}/**/`, { ignore: '**/node_modules/**' })
      .map((it) => [it, {@: project2Config.projectPath}]),
  ])
)
```
