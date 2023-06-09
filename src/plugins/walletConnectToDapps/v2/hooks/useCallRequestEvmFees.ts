import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getFeesForTx } from 'plugins/walletConnectToDapps/utils'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import { assertIsTransactionParams } from 'plugins/walletConnectToDapps/v2/typeGuards'
import type { WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { useEffect, useMemo, useState } from 'react'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export function useCallRequestEvmFees(state: WalletConnectState) {
  const [fees, setFees] = useState<FeePrice | undefined>()
  const { chainAdapter, chainId, accountId, transaction } = useWalletConnectState(state)

  const assets = useAppSelector(selectAssets)

  const feeAsset = useMemo(() => {
    const feeAssetId = chainAdapter?.getFeeAssetId()
    if (!feeAssetId) return null
    // TODO(Q): this shouldn't be feeAsset, get the real asset from request
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, chainAdapter])
  const feeAssetPrice =
    useAppSelector(state => selectMarketDataById(state, feeAsset?.assetId ?? ''))?.price ?? '0'

  useEffect(() => {
    if (!transaction || !accountId || !chainId) return
    const { account: address } = fromAccountId(accountId)
    const adapter = getChainAdapterManager().get(chainId)
    if (!(address && chainId && feeAsset && feeAssetPrice && adapter)) return
    ;(async () => {
      assertIsTransactionParams(transaction)
      const estimatedFees = await getFeesForTx(
        transaction,
        adapter as unknown as EvmBaseAdapter<EvmChainId>,
        accountId,
      )

      const initialFees: FeePrice = {
        slow: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
        average: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
        fast: {
          fiatFee: '',
          txFee: '',
          gasPriceGwei: '',
        },
      }
      const result = (Object.keys(estimatedFees) as FeeDataKey[]).reduce<FeePrice>(
        (acc: FeePrice, key: FeeDataKey) => {
          if (!Object.values(FeeDataKey).includes(key)) return acc
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(10).pow(feeAsset?.precision))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(feeAssetPrice).toPrecision()
          const gasPriceGwei = bnOrZero(estimatedFees[key].chainSpecific.gasPrice)
            .div(1e9)
            .toString()
          acc[key] = { txFee, fiatFee, gasPriceGwei }
          return acc
        },
        initialFees,
      )
      setFees(result)
    })()
  }, [accountId, chainId, feeAsset, feeAssetPrice, transaction])

  return { fees, feeAsset, feeAssetPrice }
}
