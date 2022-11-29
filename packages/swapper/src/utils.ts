import { AssertionError } from 'assert'

// asserts x is type doesn't work when using arrow functions
export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new AssertionError({ message: `Expected 'val' to be defined, but received ${val}` })
  }
}
