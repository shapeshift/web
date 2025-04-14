import { Card } from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import { skipToken, useQuery } from '@tanstack/react-query'
import { MINIMUM_RELAY_CONFIRMATIONS_UTXO } from 'packages/swapper/src/swappers/RelaySwapper/constant'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { SlideTransition } from '@/components/SlideTransition'
import { Sweep } from '@/components/Sweep'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import { useAppSelector } from '@/state/store'

export const MultiHopSweep = () => {
  const sellAsset = useAppSelector(selectInputSellAsset)
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const navigate = useNavigate()
  const {
    state: { isConnected, wallet },
  } = useWallet()

  const accountMetadataFilter = useMemo(() => ({ accountId: sellAccountId }), [sellAccountId])

  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['utxoNextReceiveAddress', sellAccountId],
    queryFn:
      wallet && accountMetadata
        ? async () => {
            if (!accountMetadata) throw new Error('No account metadata found')
            const accountType = accountMetadata.accountType
            const bip44Params = accountMetadata.bip44Params
            const chainId = fromAssetId(sellAsset.assetId).chainId

            const chainAdapter = getChainAdapterManager().get(chainId)

            if (!chainAdapter) throw new Error(`No chain adapter found for chainId: ${chainId}`)

            const firstReceiveAddress = await chainAdapter.getAddress({
              wallet,
              accountNumber: bip44Params.accountNumber,
              accountType,
              pubKey:
                isLedger(wallet) && sellAccountId
                  ? fromAccountId(sellAccountId).account
                  : undefined,
            })
            return firstReceiveAddress
          }
        : skipToken,
  })

  useEffect(() => {
    if (!isConnected) {
      navigate('/trade/input')
    }
  }, [navigate, isConnected])

  const handleSweepSeen = useCallback(() => {
    navigate('/trade/confirm')
  }, [navigate])

  if (!isConnected) return null

  return (
    <SlideTransition>
      <Card width='full' maxWidth='500px' px={6}>
        <Sweep
          assetId={sellAsset.assetId}
          fromAddress={fromAddress ?? ''}
          isLoading={!fromAddress}
          accountId={sellAccountId}
          protocolName={SwapperName.Relay}
          onSweepSeen={handleSweepSeen}
          requiredConfirmations={MINIMUM_RELAY_CONFIRMATIONS_UTXO}
        />
      </Card>
    </SlideTransition>
  )
}
