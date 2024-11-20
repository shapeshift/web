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
    this.metadata = (error as ChainAdapterError).metadata ?? metadata

    Error.captureStackTrace(this, this.constructor)
  }
}

export const ErrorHandler = async (err: unknown, metadata?: ErrorMetadata): Promise<never> => {
  if ((err as AxiosError).isAxiosError) {
    const response = JSON.stringify((err as AxiosError).response?.data)
    if (metadata) throw new ChainAdapterError(response, metadata)
    throw new Error(response)
  } else if ((err as Error).name === 'ResponseError') {
    // handle fetch api error coming from generated typescript client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = JSON.stringify(await ((err as any).response as Response).json())
    if (metadata) throw new ChainAdapterError(response, metadata)
    throw new Error(response)
  } else if (err instanceof Error || err instanceof ChainAdapterError) {
    if (metadata) throw new ChainAdapterError(err, metadata)
    throw err
  } else if (typeof err == 'string') {
    if (metadata) throw new ChainAdapterError(err, metadata)
    throw new Error(err)
  }

  if (metadata) throw new ChainAdapterError(err, metadata)
  throw new Error(JSON.stringify(err))
}
