export const ErrorHandler = (err: string | Error | unknown): never => {
  // TODO: handle error
  if (err instanceof Error) {
    throw err
  } else if (typeof err == 'string') {
    throw new Error(err)
  } else {
    throw new Error(JSON.stringify(err))
  }
}
