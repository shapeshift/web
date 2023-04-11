import { createErrorClass } from './createErrorClass'

type ValidationErrorDetails = { name: string; actual: unknown; expected: unknown }

export const ValidationError = createErrorClass<ValidationErrorDetails>('ValidationError')
