import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import type { PanoraSwapRequest, PanoraSwapResponse } from '../types'
import { getPanoraRequestError } from './helpers'
import { panoraService } from './panoraService'

export const fetchPanoraSwap = async ({
  request,
  apiKey,
}: {
  request: PanoraSwapRequest
  apiKey: string
}): Promise<Result<PanoraSwapResponse, SwapErrorRight>> => {
  const maybeResponse = await panoraService.post<PanoraSwapResponse>('/swap', request, {
    headers: { 'x-api-key': apiKey },
  })

  if (maybeResponse.isErr()) return Err(getPanoraRequestError(maybeResponse.unwrapErr()))

  return Ok(maybeResponse.unwrap().data)
}
