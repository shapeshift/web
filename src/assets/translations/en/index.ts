import * as path from 'path'
let context = require.context('./', false)
let files: any = {}

context.keys().forEach((filename: string) => {
  if (filename.endsWith('.json')) {
    const locale: string = path.basename(filename, '.json')
    const fileContext: string = context(filename)
    files[locale] = fileContext
  }
})

export { files as en }

// import main from './main.json'
// import plugins from './plugins.json'

// export const en { ...main, ...plugins }
