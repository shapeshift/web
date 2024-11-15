import type { AxiosError } from 'axios'
import type { InterpolationOptions } from 'node-polyglot'

type ErrorMetadata = {
  translation: string
  options?: InterpolationOptions
}

export class ChainAdapterError extends Error {
  metadata: ErrorMetadata

  constructor(error: unknown, metadata: ErrorMetadata) {
    if (typeof error === 'string') {
      super(error)
    } else if (error instanceof Error || error instanceof ChainAdapterError) {
      super(error.message)
    } else {
      super(`Unknown Error: ${error}`)
    }

    this.name = this.constructor.name
    this.metadata = (error as any).metadata ?? metadata

    Error.captureStackTrace(this, this.constructor)
  }
}

export const ErrorHandler = async (err: unknown): Promise<never> => {
  if ((err as AxiosError).isAxiosError) {
    throw new Error(JSON.stringify((err as AxiosError).response?.data))
  } else if ((err as Error).name === 'ResponseError') {
    // handle fetch api error coming from generated typescript client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await ((err as any).response as Response).json()
    throw new Error(JSON.stringify(response))
  } else if (err instanceof Error || err instanceof ChainAdapterError) {
    throw err
  } else if (typeof err == 'string') {
    throw new Error(err)
  } else {
    throw new Error(JSON.stringify(err))
  }
}

export const handleError = (err: unknown): Error | ChainAdapterError => {
  if ((err as AxiosError).isAxiosError) {
    return new Error(JSON.stringify((err as AxiosError).response?.data))
  } else if ((err as Error).name === 'ResponseError') {
    // handle fetch api error coming from generated typescript client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;((err as any).response as Response).json().then(response => {
      return new Error(JSON.stringify(response))
    })
  } else if (err instanceof Error || err instanceof ChainAdapterError) {
    return err
  } else if (typeof err == 'string') {
    return new Error(err)
  }

  return new Error(JSON.stringify(err))
}
