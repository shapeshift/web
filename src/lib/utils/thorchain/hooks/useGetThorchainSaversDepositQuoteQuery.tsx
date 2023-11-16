import { fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { useMemo } from 'react'
import { encodeFunctionData, getAddress } from 'viem'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { useRouterContractAddress } from 'lib/swapper/swappers/ThorchainSwapper/utils/useRouterContractAddress'
import { isToken } from 'lib/utils'
import { assertGetEvmChainAdapter, createBuildCustomTxInput } from 'lib/utils/evm'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { getMaybeThorchainSaversDepositQuote } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { useAppSelector } from 'state/store'

// Gets a THORCHain quote and associated BuildCustomTxInput input
// for fees estimation and/or Tx building purposes
export const useGetThorchainSaversDepositQuoteQuery = ({
  asset,
  amountCryptoBaseUnit,
  isApprovalRequired,
  accountNumber,
}: {
  asset: Asset
  amountCryptoBaseUnit: BigNumber.Value | null | undefined
  isApprovalRequired: boolean
  accountNumber: number | undefined
}) => {
  const {
    state: { wallet },
  } = useWallet()

  const depositQuoteQueryKey = useMemo(
    () => ['thorchainLendingPoolData', { asset, amountCryptoBaseUnit }] as const,
    [amountCryptoBaseUnit, asset],
  )

  const isTokenDeposit = isToken(fromAssetId(asset.assetId).assetReference)

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.assetId))
  const saversRouterContractAddress = useRouterContractAddress({
    feeAssetId: feeAsset?.assetId ?? '',
    skip: !isTokenDeposit || !feeAsset?.assetId,
  })

  const depositQuoteQuery = useQuery({
    queryKey: depositQuoteQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { asset, amountCryptoBaseUnit }] = queryKey
      const maybeQuote = await getMaybeThorchainSaversDepositQuote({
        asset,
        amountCryptoBaseUnit,
      })

      if (maybeQuote.isErr()) throw new Error(maybeQuote.unwrapErr())

      const quote = maybeQuote.unwrap()

      const customTxInput = await (async () => {
        if (!(wallet && isTokenDeposit && !isApprovalRequired && accountNumber !== undefined))
          return

        const adapter = assertGetEvmChainAdapter(asset.chainId)

        const thorContract = getOrCreateContractByType({
          address: saversRouterContractAddress!,
          type: ContractType.ThorRouter,
          chainId: asset.chainId,
        })

        const data = encodeFunctionData({
          abi: thorContract.abi,
          functionName: 'depositWithExpiry',
          args: [
            getAddress(quote.inbound_address),
            getAddress(fromAssetId(asset.assetId).assetReference),
            BigInt(amountCryptoBaseUnit?.toString() ?? 0),
            quote.memo,
            BigInt(quote.expiry),
          ],
        })

        return await createBuildCustomTxInput({
          accountNumber,
          adapter,
          data,
          value: '0', // this is not a token send, but a smart contract call so we don't send anything here, THOR router does
          to: saversRouterContractAddress!,
          wallet,
        })
      })()

      return { quote, customTxInput }
    },
    enabled: true,
    // 5s stale time, which is enough for the quote to still be valid, but avoids us spamming
    // THORChain and unchained
    staleTime: 5000,
  })

  return depositQuoteQuery
}
