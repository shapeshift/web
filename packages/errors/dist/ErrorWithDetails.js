"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _ErrorWithDetails_code;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorWithDetails = void 0;
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const lodash_snakecase_1 = __importDefault(require("lodash.snakecase"));
const ErrorWithCause_1 = require("./ErrorWithCause");
class ErrorWithDetails extends ErrorWithCause_1.ErrorWithCause {
    constructor(message, options) {
        super(message, options);
        /**
         * A string representing the error state
         *
         * This allows different language translations to be used for a given error
         * rather than relying on the text the programmer put in the error message
         */
        _ErrorWithDetails_code.set(this, void 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (options?.details)
            this.details = (0, lodash_clonedeep_1.default)(options.details);
        this.code = options?.code;
    }
    get code() {
        return __classPrivateFieldGet(this, _ErrorWithDetails_code, "f");
    }
    /**
     * Normalize error codes to uppercase + snake_case for consistency
     */
    set code(value) {
        __classPrivateFieldSet(this, _ErrorWithDetails_code, (0, lodash_snakecase_1.default)(value || 'ERR_UNKNOWN').toUpperCase(), "f");
    }
}
exports.ErrorWithDetails = ErrorWithDetails;
_ErrorWithDetails_code = new WeakMap();
