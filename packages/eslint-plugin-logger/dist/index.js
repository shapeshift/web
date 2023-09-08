"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rules = void 0;
const utils_1 = require("./utils");
function isMemberAccess(reference) {
    const node = reference.identifier;
    const parent = node.parent;
    return parent?.type === 'MemberExpression' && parent.object === node;
}
function isConsole(reference) {
    const id = reference.identifier;
    return id && id.name === 'console';
}
exports.rules = {
    'no-native-console': {
        meta: {
            type: 'problem',
        },
        create(context) {
            function report(reference) {
                const node = reference.identifier;
                const method = node.parent.property.name;
                const consoleCallNode = node?.parent?.parent;
                node.loc &&
                    consoleCallNode &&
                    context.report({
                        node: consoleCallNode,
                        loc: node.loc,
                        // @ts-ignore, typescript-eslint `ReportDescriptor` TS types doesn't have a message property, but the raw eslint rules have it
                        message: `No native console.${method} allowed, use moduleLogger.${method} instead`,
                    });
            }
            return {
                'Program:exit'() {
                    const scope = context.getScope();
                    const consoleVar = (0, utils_1.getVariableByName)(scope, 'console');
                    const shadowed = consoleVar && consoleVar.defs.length > 0;
                    /*
                     * 'scope.through' includes all references to undefined
                     * variables. If the variable 'console' is not defined, it uses
                     * 'scope.through'.
                     */
                    // @ts-ignore
                    const references = consoleVar ? consoleVar.references : scope.through.filter(isConsole);
                    if (!shadowed) {
                        references
                            .filter(isMemberAccess)
                            .filter(reference => {
                            const node = reference.identifier;
                            const method = node.parent.property
                                .name;
                            return method !== 'consoleFn'; // Exclude moduleLogger itself from being reported
                        })
                            .forEach(report);
                    }
                },
            };
        },
    },
};
