export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NONE = 'none'
}

export interface LoggerOptions {
  /**
   * Alias for "namespace"
   */
  name?: string
  /**
   * namespace allows you to keep "breadcrumbs" of where the error is coming from
   * As you add to the namespace, the log entry will include a colon-separated list
   */
  namespace?: string | string[]
  /**
   * The severity of the log entry ranging from TRACE to ERROR
   */
  level?: LogLevel | string
  /**
   * A set of properties and values to be included in every log entry
   * @example
   * { defaultFields: { fn: 'myRunningFunction' } }
   */
  defaultFields?: Record<string, unknown>
  /**
   * A function that accepts a log level and data and returns nothing
   *
   * Use this to implement custom logging such as to the console or a
   * log aggregation service.
   */
  logFn?: LoggerFunction
}

export type Arg1 = unknown | Arg2
export type Arg2 = Record<string, unknown> | Arg3
export type Arg3 = string

/**
 * Calls to the logger are strictly typed and arguments must be passed in a specific order
 * "message" is always last
 */
export type LoggerMethod =
  | ((arg1: Arg1, arg2?: Arg2, arg3?: Arg3) => void)
  | ((message: string) => void)
  | ((fields: Record<string, unknown>, message: string) => void)
  | ((e: unknown, fields: Record<string, unknown>, message: string) => void)
  | ((e: unknown, message: string) => void)

// return values are any instead of void because
// if they return the value provided then the
// logger is composable
export interface LoggerMethods {
  error: LoggerMethod
  warn: LoggerMethod
  info: LoggerMethod
  debug: LoggerMethod
  trace: LoggerMethod
}

export interface LoggerExtended {
  isLogger: true
  child(...x: unknown[]): LoggerT
}

export type LoggerT = LoggerMethods & LoggerExtended

export interface FormattedError {
  message: string
  stack?: string
  kind: string
  // Additional properties supported by @shapeshiftoss/errors ErrorWithDetails
  code?: string
  details?: Record<string, unknown>
  cause?: unknown
}

/**
 * The structure of the data provided to the LoggerFunction
 */
export interface FormattedObject {
  message?: string
  error?: FormattedError
  [k: string]: unknown
}

export interface LogData extends FormattedObject {
  /**
   * This only exists if more than 1 plain string was passed to the logger
   * This should only be possible in plain JS or with @ts-ignore
   */
  _messages?: string[]
  namespace?: string
  timestamp: string
  status: LogLevel
}

/**
 * A function responsible for processing log data
 */
export type LoggerFunction = (level: Exclude<LogLevel, LogLevel.NONE>, data: LogData) => void
