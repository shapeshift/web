import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getFeesForTx } from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/v1/bridge/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useEffect, useMemo, useState } from 'react'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export function useCallRequestFees(
  request: WalletConnectEthSendTransactionCallRequest['params'][number],
) {
  const [fees, setFees] = useState<FeePrice | undefined>()

  const { evmChainId, wcAccountId } = useWalletConnect()
  const assets = useAppSelector(selectAssets)

  const feeAsset = useMemo(() => {
    if (!evmChainId) return
    const feeAssetId = getChainAdapterManager().get(evmChainId)?.getFeeAssetId()
    if (!feeAssetId) return null
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, evmChainId])
  const feeAssetPrice =
    useAppSelector(state => selectMarketDataById(state, feeAsset?.assetId ?? ''))?.price ?? '0'

  useEffect(() => {
    if (!wcAccountId || !request || !evmChainId) return
    const { account: address } = fromAccountId(wcAccountId)
    const adapter = getChainAdapterManager().get(evmChainId)
    if (!(address && evmChainId && feeAsset && feeAssetPrice && adapter)) return
    ;(async () => {
      const estimatedFees = await getFeesForTx(
        request,
        adapter as unknown as EvmBaseAdapter<EvmChainId>,
        wcAccountId,
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
  }, [wcAccountId, evmChainId, feeAsset, feeAssetPrice, request])

  return { fees, feeAsset, feeAssetPrice }
}
