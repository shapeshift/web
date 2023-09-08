"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const format_1 = require("./format");
const logger_type_1 = require("./logger.type");
const childIgnoredFields = Object.freeze([
    'name',
    'namespace',
    'level',
    'defaultFields',
    'timestamp',
    'status',
    'logFn',
]);
const rankedLogLevels = Object.freeze([
    logger_type_1.LogLevel.TRACE,
    logger_type_1.LogLevel.DEBUG,
    logger_type_1.LogLevel.INFO,
    logger_type_1.LogLevel.WARN,
    logger_type_1.LogLevel.ERROR,
    logger_type_1.LogLevel.NONE,
]);
const rankedLogLevelStrings = Object.freeze(rankedLogLevels.map(String));
/**
 * The default logging function to use when none is provided
 *
 * This uses `console` to log out a JSON string of the data.
 */
const defaultLogFn = (level, data) => {
    // console.trace outputs stack traces so we use debug instead
    const consoleFn = level === logger_type_1.LogLevel.TRACE ? logger_type_1.LogLevel.DEBUG : level;
    // eslint-disable-next-line no-console
    console[consoleFn](JSON.stringify(data));
};
class Logger {
    constructor(options) {
        this.namespace = [];
        const { level, defaultFields, namespace, name, logFn } = options || {};
        this.level = typeof level === 'string' ? rankedLogLevelStrings.indexOf(level) : 2;
        if (this.level < 0 || this.level >= rankedLogLevels.length) {
            throw new Error('Invalid debug logging level');
        }
        this.logFn = logFn || defaultLogFn;
        // Add key/values to be included in every log entry
        this.defaultFields = (0, format_1.format)(defaultFields) ?? {};
        // A child logger will provide the parent's namespace
        if (Array.isArray(namespace)) {
            this.namespace = this.namespace.concat(namespace);
        }
        else if (typeof namespace === 'string') {
            this.namespace.push(namespace);
        }
        // Add this new name onto the namespace
        if (name)
            this.namespace.push(name);
    }
    get isLogger() {
        return true;
    }
    child(options) {
        const newOptions = { level: rankedLogLevels[this.level], logFn: this.logFn, ...options };
        // Keep the parent namespace
        newOptions.namespace = this.namespace.concat(newOptions.namespace || []);
        // Merge the default fields. For conflicts, keep the child logger's value
        newOptions.defaultFields = { ...this.defaultFields, ...(0, format_1.format)(options?.defaultFields) };
        for (const [k, v] of Object.entries(newOptions)) {
            // Will be formatted in the constructor
            if (!childIgnoredFields.includes(k))
                newOptions.defaultFields[k] = v;
        }
        return new Logger(newOptions);
    }
    log(level, arg1, arg2, arg3) {
        // No-op if logging is disabled
        if (rankedLogLevels.indexOf(level) < this.level || level === logger_type_1.LogLevel.NONE)
            return;
        const args = [arg1, arg2, arg3];
        const argsFormatted = args.map(format_1.format);
        const result = {
            ...this.defaultFields,
            ...argsFormatted[0],
            ...argsFormatted[1],
            ...argsFormatted[2],
            timestamp: new Date().toISOString(),
            namespace: this.namespace.join(':') || undefined,
            status: level,
        };
        // I'm concerned that this will add unnecessary overhead to all logging calls
        // just to support a small use case. How can we optimize this?
        const stringArgs = args.filter((a) => typeof a === 'string');
        if (stringArgs.length > 1)
            result._messages = stringArgs;
        this.logFn(level, result);
    }
    trace(arg1, arg2, arg3) {
        return this.log(logger_type_1.LogLevel.TRACE, arg1, arg2, arg3);
    }
    debug(arg1, arg2, arg3) {
        return this.log(logger_type_1.LogLevel.DEBUG, arg1, arg2, arg3);
    }
    info(arg1, arg2, arg3) {
        return this.log(logger_type_1.LogLevel.INFO, arg1, arg2, arg3);
    }
    warn(arg1, arg2, arg3) {
        return this.log(logger_type_1.LogLevel.WARN, arg1, arg2, arg3);
    }
    error(arg1, arg2, arg3) {
        return this.log(logger_type_1.LogLevel.ERROR, arg1, arg2, arg3);
    }
}
exports.Logger = Logger;
