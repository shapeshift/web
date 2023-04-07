import { createErrorClass } from './createErrorClass'

type ValidationErrorDetails = { name: string; actual: unknown; expected: unknown }

export default createErrorClass<ValidationErrorDetails>('ValidationError')
