import { Scope, Variable } from 'eslint-scope'

export const getVariableByName = (initScope: Scope | null, name: string): Variable | null => {
  let scope = initScope

  while (scope) {
    const variable = scope.set.get(name)

    if (variable) {
      return variable
    }

    scope = scope.upper
  }

  return null
}
