import { convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { Address } from 'viem'

import type { SwapErrorRight } from '../../../types'
import type {
  KyberBuildData,
  KyberBuildResponse,
  KyberFeeParams,
  KyberRoutesResponse,
  KyberRouteSummary,
} from '../types'
import type { KyberSupportedChainId } from './constants'
import { KYBER_CHAINS, KYBER_CLIENT_ID } from './constants'
import { getKyberRequestError, validateKyberBuild, validateKyberRoute } from './helpers'
import { kyberService } from './kyberService'

export const fetchKyberRoute = async ({
  chainId,
  tokenIn,
  tokenOut,
  sellAmountCryptoBaseUnit,
  feeParams,
  origin,
  baseUrl,
}: {
  chainId: KyberSupportedChainId
  tokenIn: Address
  tokenOut: Address
  sellAmountCryptoBaseUnit: string
  feeParams: KyberFeeParams | undefined
  origin: string | undefined
  baseUrl: string
}): Promise<Result<KyberRouteSummary, SwapErrorRight>> => {
  const maybeResponse = await kyberService.get<KyberRoutesResponse>(
    `${baseUrl}/${KYBER_CHAINS[chainId]}/api/v1/routes`,
    {
      params: {
        tokenIn,
        tokenOut,
        amountIn: sellAmountCryptoBaseUnit,
        ...(origin ? { origin } : {}),
        ...feeParams,
      },
    },
  )

  if (maybeResponse.isErr()) return Err(getKyberRequestError(maybeResponse.unwrapErr()))

  return validateKyberRoute(maybeResponse.unwrap().data, feeParams)
}

export type KyberBuildArgs = {
  chainId: KyberSupportedChainId
  routeSummary: KyberRouteSummary
  slippageTolerancePercentageDecimal: string
  baseUrl: string
}

export const fetchKyberBuild = async ({
  chainId,
  routeSummary,
  slippageTolerancePercentageDecimal,
  baseUrl,
  sender,
  recipient,
  deadline,
}: KyberBuildArgs & {
  sender: string
  recipient: string
  deadline: number
}): Promise<Result<KyberBuildData, SwapErrorRight>> => {
  const maybeResponse = await kyberService.post<KyberBuildResponse>(
    `${baseUrl}/${KYBER_CHAINS[chainId]}/api/v1/route/build`,
    {
      routeSummary,
      sender,
      recipient,
      origin: sender,
      slippageTolerance: convertDecimalPercentageToBasisPoints(
        slippageTolerancePercentageDecimal,
      ).toNumber(),
      deadline,
      source: KYBER_CLIENT_ID,
    },
  )

  if (maybeResponse.isErr()) return Err(getKyberRequestError(maybeResponse.unwrapErr()))

  return validateKyberBuild(maybeResponse.unwrap().data)
}
