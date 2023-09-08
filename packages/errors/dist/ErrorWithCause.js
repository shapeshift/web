"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorWithCause = void 0;
class ErrorWithCause extends Error {
    constructor(message, options) {
        super(message);
        this.name = this.constructor.name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.cause = options?.cause;
    }
}
exports.ErrorWithCause = ErrorWithCause;
