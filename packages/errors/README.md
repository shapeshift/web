# @shapeshiftoss/errors

This package contains named errors and a function to create new named errors

## Installation

It's recommend to add this package to `peerDependencies` to avoid duplicate versions of the package
which will cause `instanceof` checks to fail.

## Usage

```ts
import { ValidationError } from '@shapeshiftoss/errors'

throw new ValidationError('txId cannot be null', { details: { name: 'txId', expected: 'not null', actual: 'null' }})
```

### Create a new named error
```ts
import { createErrorClass } from '@shapeshiftoss/errors'

const MyError = createErrorClass<{ myDetails: string }>('MyError')

try {
  throw new MyError('My cool error', { details: { myDetails: 'string' } })
} catch (e) {
  assert.ok(e instanceof MyError)
}

```

### Error.code

All errors support a `code` property. This property is designed to be used for internationalization
so that translated text can be displayed based on the `code` rather than on the `message`.

```ts
import { RateLimitError } from '@shapeshiftoss/errors'

const e = new RateLimitError('Something bad happened', { code: 'ERR_RATE_LIMIT_INFURA' })
```

## Types

```
ForbiddenError - Authorized but not allowed access request resource
NotFoundError - Can not find requested entity
RateLimitError - API returned a 429 error
UnauthorizedError - Trying to access a protected resource
ValidationError - Invalid data provided
```
