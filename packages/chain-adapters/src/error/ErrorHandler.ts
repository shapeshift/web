import { AxiosError } from 'axios'

export const ErrorHandler = (err: unknown): never => {
  if ((err as AxiosError).isAxiosError) {
    throw new Error(JSON.stringify((err as AxiosError).response?.data))
  } else if (err instanceof Error) {
    throw err
  } else if (typeof err == 'string') {
    throw new Error(err)
  } else {
    throw new Error(JSON.stringify(err))
  }
}
