import {
  BaseNode,
  MemberExpressionNonComputedName,
} from '@typescript-eslint/types/dist/generated/ast-spec'
import { TSESTree } from '@typescript-eslint/utils'
import { RuleModule } from '@typescript-eslint/utils/dist/ts-eslint'
import { Reference, Scope } from 'eslint-scope'

import { getVariableByName } from './utils'

function isMemberAccess(reference: Reference) {
  const node = reference.identifier as TSESTree.Node
  const parent = node.parent

  return parent?.type === 'MemberExpression' && parent.object === node
}

function isConsole(reference: Reference) {
  const id = reference.identifier

  return id && id.name === 'console'
}

export const rules: Record<
  string,
  { meta: { type: string }; create: RuleModule<string, []>['create'] }
> = {
  'no-native-console': {
    meta: {
      type: 'problem',
    },
    create(context) {
      function report(reference: Reference) {
        const node = reference.identifier as BaseNode
        const method = (node.parent as MemberExpressionNonComputedName).property.name
        const consoleCallNode = node?.parent?.parent

        node.loc &&
          consoleCallNode &&
          context.report({
            node: consoleCallNode,
            loc: node.loc,
            // @ts-ignore, typescript-eslint `ReportDescriptor` TS types doesn't have a message property, but the raw eslint rules have it
            message: `No native console.${method} allowed, use moduleLogger.${method} instead`,
          })
      }

      return {
        'Program:exit'() {
          const scope = context.getScope() as Scope
          const consoleVar = getVariableByName(scope, 'console')
          const shadowed = consoleVar && consoleVar.defs.length > 0

          /*
           * 'scope.through' includes all references to undefined
           * variables. If the variable 'console' is not defined, it uses
           * 'scope.through'.
           */
          // @ts-ignore
          const references = consoleVar ? consoleVar.references : scope.through.filter(isConsole)

          if (!shadowed) {
            references
              .filter(isMemberAccess)
              .filter((reference) => {
                const node = reference.identifier as BaseNode
                const method = (node.parent as MemberExpressionNonComputedName).property.name

                return method !== 'consoleFn' // Exclude moduleLogger itself from being reported
              })
              .forEach(report)
          }
        },
      }
    },
  },
}
