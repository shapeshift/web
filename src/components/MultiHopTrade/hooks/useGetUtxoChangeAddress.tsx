import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useGetUtxoChangeAddress = ({
  sellAsset,
  sellAssetAccountId,
}: {
  sellAsset: Asset | undefined
  sellAssetAccountId: string | undefined
}) => {
  const {
    state: { wallet },
  } = useWallet()

  // Get account metadata for the sell account
  const accountMetadataFilter = useMemo(() => {
    return sellAssetAccountId ? { accountId: sellAssetAccountId } : undefined
  }, [sellAssetAccountId])

  const accountMetadata = useAppSelector(state =>
    accountMetadataFilter
      ? selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter)
      : undefined,
  )

  // Check if the sell asset is a UTXO asset
  const isUtxoChain = useMemo(() => {
    if (!sellAsset) return false
    const { chainNamespace } = fromChainId(sellAsset.chainId)
    return chainNamespace === CHAIN_NAMESPACE.Utxo
  }, [sellAsset])

  const { data: changeAddress, isLoading } = useQuery({
    queryKey: [
      'utxo-change-address',
      sellAsset?.chainId,
      accountMetadata?.bip44Params?.accountNumber,
      accountMetadata?.accountType,
    ],
    queryFn:
      sellAsset && accountMetadata && wallet
        ? async () => {
            console.log(
              'QUERY',
              sellAsset.chainId,
              accountMetadata?.bip44Params?.accountNumber,
              accountMetadata?.accountType,
            )
            const { chainNamespace: sellAssetChainNamespace } = fromChainId(sellAsset.chainId)
            const isUtxo = sellAssetChainNamespace === CHAIN_NAMESPACE.Utxo

            console.log({ isUtxo, accountMetadata })
            if (!isUtxo || accountMetadata.accountType === undefined) return null

            const adapter = assertGetUtxoChainAdapter(sellAsset.chainId)

            const changeAddress = await adapter.getAddress({
              accountNumber: accountMetadata.bip44Params.accountNumber,
              accountType: accountMetadata.accountType,
              wallet,
              isChange: true,
            })

            return changeAddress
          }
        : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    changeAddress,
    isLoading,
    isUtxoChain,
  }
}
