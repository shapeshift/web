import type { API, FileInfo } from 'jscodeshift'

const transform = (fileInfo: FileInfo, api: API) => {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  root.find(j.ExportNamedDeclaration).forEach(path => {
    const objectExpression = j(path)
      .find(j.VariableDeclarator, { id: { name: 'clearAssetsMigrations' } })
      .find(j.ObjectExpression)
      .at(0)

    if (objectExpression.paths().length > 0) {
      const properties = objectExpression.paths()[0].value.properties

      // cba to get the types right for this, this is a one-off jscodeshift script
      const lastKey = Math.max(...properties.map(prop => parseInt((prop as any).key.value, 10)))

      // Create a new property to add
      const newProperty = j.property('init', j.literal(lastKey + 1), j.identifier('clearAssets'))

      properties.push(newProperty)
    }
  })

  return root.toSource({ quote: 'single', trailingComma: true })
}

// We *have* to default export this.
// eslint-disable-next-line
export default transform
