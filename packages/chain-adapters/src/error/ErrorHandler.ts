import type { AxiosError } from 'axios'

export const ErrorHandler = async (err: unknown): Promise<never> => {
  if ((err as AxiosError).isAxiosError) {
    throw new Error(JSON.stringify((err as AxiosError).response?.data))
  } else if ((err as Error).name === 'ResponseError') {
    // handle fetch api error coming from generated typescript client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await ((err as any).response as Response).json()
    throw new Error(JSON.stringify(response))
  } else if (err instanceof Error) {
    throw err
  } else if (typeof err == 'string') {
    throw new Error(err)
  } else {
    throw new Error(JSON.stringify(err))
  }
}
