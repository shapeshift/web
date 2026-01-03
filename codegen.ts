import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  generates: {
    'src/lib/graphql/generated/types.ts': {
      plugins: ['typescript'],
      config: {
        useTypeImports: true,
        skipTypename: true,
      },
    },
  },
  ignoreNoDocuments: true,
}

export default config
