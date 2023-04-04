import format from './format'
import {
  Arg1,
  Arg2,
  Arg3,
  LogData,
  LoggerFunction,
  LoggerOptions,
  LoggerT,
  LogLevel,
} from './logger.type'

const childIgnoredFields = Object.freeze([
  'name',
  'namespace',
  'level',
  'defaultFields',
  'timestamp',
  'status',
  'logFn',
])

const rankedLogLevels = Object.freeze([
  LogLevel.TRACE,
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.WARN,
  LogLevel.ERROR,
  LogLevel.NONE,
])

const rankedLogLevelStrings = Object.freeze(rankedLogLevels.map(String))

/**
 * The default logging function to use when none is provided
 *
 * This uses `console` to log out a JSON string of the data.
 */
const defaultLogFn: LoggerFunction = (level, data) => {
  // console.trace outputs stack traces so we use debug instead
  const consoleFn = level === LogLevel.TRACE ? LogLevel.DEBUG : level
  // eslint-disable-next-line no-console
  console[consoleFn](JSON.stringify(data))
}

export default class Logger implements LoggerT {
  private readonly level: number
  private readonly defaultFields?: Record<string, unknown>
  private namespace: string[] = []
  private readonly logFn: LoggerFunction

  constructor(options?: LoggerOptions) {
    const { level, defaultFields, namespace, name, logFn } = options || {}
    this.level = typeof level === 'string' ? rankedLogLevelStrings.indexOf(level) : 2
    if (this.level < 0 || this.level >= rankedLogLevels.length) {
      throw new Error('Invalid debug logging level')
    }

    this.logFn = logFn || defaultLogFn
    // Add key/values to be included in every log entry
    this.defaultFields = format(defaultFields) ?? {}
    // A child logger will provide the parent's namespace
    if (Array.isArray(namespace)) {
      this.namespace = this.namespace.concat(namespace)
    } else if (typeof namespace === 'string') {
      this.namespace.push(namespace)
    }
    // Add this new name onto the namespace
    if (name) this.namespace.push(name)
  }

  get isLogger(): true {
    return true
  }

  child(options?: LoggerOptions & Record<string, unknown>) {
    const newOptions = { level: rankedLogLevels[this.level], logFn: this.logFn, ...options }
    // Keep the parent namespace
    newOptions.namespace = this.namespace.concat(newOptions.namespace || [])
    // Merge the default fields. For conflicts, keep the child logger's value
    newOptions.defaultFields = { ...this.defaultFields, ...format(options?.defaultFields) }

    for (const [k, v] of Object.entries(newOptions)) {
      // Will be formatted in the constructor
      if (!childIgnoredFields.includes(k)) newOptions.defaultFields[k] = v
    }

    return new Logger(newOptions)
  }

  log(level: LogLevel, error: unknown, metadata: Record<string, unknown>, message: string): void
  log(level: LogLevel, error: unknown, message: string): void
  log(level: LogLevel, error: unknown, message: string): void
  log(level: LogLevel, metadata: Record<string, unknown>, message: string): void
  log(level: LogLevel, message: string): void
  log(level: LogLevel, arg1: Arg1, arg2?: Arg2, arg3?: Arg3): void
  log(
    level: LogLevel,
    arg1: unknown | Record<string, unknown> | string,
    arg2?: Record<string, unknown> | string,
    arg3?: string,
  ) {
    // No-op if logging is disabled
    if (rankedLogLevels.indexOf(level) < this.level || level === LogLevel.NONE) return

    const args = [arg1, arg2, arg3]
    const argsFormatted = args.map(format)
    const result: LogData = {
      ...this.defaultFields,
      ...argsFormatted[0],
      ...argsFormatted[1],
      ...argsFormatted[2],
      timestamp: new Date().toISOString(),
      namespace: this.namespace.join(':') || undefined,
      status: level,
    }

    // I'm concerned that this will add unnecessary overhead to all logging calls
    // just to support a small use case. How can we optimize this?
    const stringArgs = args.filter((a): a is string => typeof a === 'string')
    if (stringArgs.length > 1) result._messages = stringArgs

    this.logFn(level, result)
  }

  trace(error: unknown, metadata: Record<string, unknown>, message: string): void
  trace(error: unknown, message: string): void
  trace(metadata: Record<string, unknown>, message: string): void
  trace(message: string): void
  trace(arg1: Arg1, arg2?: Arg2, arg3?: Arg3) {
    return this.log(LogLevel.TRACE, arg1, arg2, arg3)
  }

  debug(error: unknown, metadata: Record<string, unknown>, message: string): void
  debug(error: unknown, message: string): void
  debug(metadata: Record<string, unknown>, message: string): void
  debug(message: string): void
  debug(arg1: Arg1, arg2?: Arg2, arg3?: Arg3) {
    return this.log(LogLevel.DEBUG, arg1, arg2, arg3)
  }

  info(error: unknown, metadata: Record<string, unknown>, message: string): void
  info(error: unknown, message: string): void
  info(metadata: Record<string, unknown>, message: string): void
  info(message: string): void
  info(arg1: Arg1, arg2?: Arg2, arg3?: Arg3) {
    return this.log(LogLevel.INFO, arg1, arg2, arg3)
  }

  warn(error: unknown, metadata: Record<string, unknown>, message: string): void
  warn(error: unknown, message: string): void
  warn(metadata: Record<string, unknown>, message: string): void
  warn(message: string): void
  warn(arg1: Arg1, arg2?: Arg2, arg3?: Arg3) {
    return this.log(LogLevel.WARN, arg1, arg2, arg3)
  }

  error(error: unknown, metadata: Record<string, unknown>, message: string): void
  error(error: unknown, message: string): void
  error(metadata: Record<string, unknown>, message: string): void
  error(message: string): void
  error(arg1: Arg1, arg2?: Arg2, arg3?: Arg3) {
    return this.log(LogLevel.ERROR, arg1, arg2, arg3)
  }
}
