export const assertUnreachable = (x: never): never => {
  throw Error(`unhandled case: ${x}`)
}
