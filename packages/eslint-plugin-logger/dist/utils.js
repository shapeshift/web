"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVariableByName = void 0;
const getVariableByName = (initScope, name) => {
    let scope = initScope;
    while (scope) {
        const variable = scope.set.get(name);
        if (variable) {
            return variable;
        }
        scope = scope.upper;
    }
    return null;
};
exports.getVariableByName = getVariableByName;
