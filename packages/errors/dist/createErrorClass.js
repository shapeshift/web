"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorClass = void 0;
const ErrorWithDetails_1 = require("./ErrorWithDetails");
function createErrorClass(name) {
    const cls = {
        [name]: class extends ErrorWithDetails_1.ErrorWithDetails {
            constructor(message, options) {
                super(message, options);
                this.name = name;
                this.code = options?.code || `ERR_${name.substring(0, name.indexOf('Error'))}`;
            }
        },
    };
    return cls[name];
}
exports.createErrorClass = createErrorClass;
