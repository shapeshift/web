# @shapeshiftoss/logger

Shapeshift's JSON logging library.

## Installation

```bash
yarn add @shapeshiftoss/logger
```

## Initialization

```javascript
import { Logger } from '@shapeshiftoss/logger'

const logger = new Logger({
  // name of the app or service
  namespace: ['Parent'],
  // alias: name: 'Parent'
  // severity threshold (default='info')
  level: 'debug',
  // extra fields to include on each message
  defaultFields: {
      fn: 'defaultFn'
  }
})
```

## Logging

### Functions

* trace
* debug
* info
* warn
* error

### Examples
```javascript
// (string)
logger.info('my message')
// {"fn":"defaultFn","message":"my message",
//   "timestamp":"2021-10-25T17:48:33.255Z","namespace":"Parent","status":"info"}

// (object)
logger.debug({ txid: '123aef' })
// {"fn":"defaultFn","txid":"123aef",
//   "timestamp":"2021-10-25T17:49:21.105Z","namespace":"Parent","status":"debug"}

// (error)
logger.error(new Error('something went wrong'))
// {"fn":"defaultFn","error":{"message":"something went wrong","stack":"...snip...","kind":"Error"},
//  "timestamp":"2021-10-25T17:49:31.626Z","namespace":"Parent","status":"error"}

// (error, object, string)
logger.error(
    new Error('something went wrong'),
    { data: { orderId: '123-aef-33' }},
    'error occured while fetching order'
)
/*
{"fn":"defaultFn",
  "error":{"message":"something went wrong","stack":"...snip...","kind":"Error"},
  "data":{"orderId":"123-aef-33"},
  "message":"error occured while fetching order",
  "timestamp":"2021-10-25T17:50:53.101Z",
  "namespace":"Parent",
  "status":"error"
}
 */
```


## Child loggers

```javascript
const child = logger.child({ foo: 'bar' })
child.info({ biz: 'baz' }, 'hello!') 
// {"fn":"defaultFn","foo":"bar","biz":"baz","message":"hello!",
//   "timestamp":"2021-10-25T17:52:29.111Z","namespace":"Parent","status":"info"}
```

### Namespacing

The `namespace` configuration property can be used to keep track of the depth/call stack.

When including `namespace` in a child, it APPENDS the values to the existing namespace making it easy to see in the output the chain that leads to the output.

```javascript
const child2 = child.child({ namespace: ['MyModule', 'myFunction']})
child.info({ biz: 'baz' }, 'hello!') 
// {"fn":"defaultFn","biz":"baz","message":"hello!",
//   "timestamp":"2021-10-25T17:53:55.909Z","namespace":"Parent:MyModule:myFunction","status":"info"}
```
