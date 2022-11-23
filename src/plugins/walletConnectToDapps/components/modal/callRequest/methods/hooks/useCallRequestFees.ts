import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
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
    const feeAssetId = getChainAdapterManager().get(evmChainId)?.getFeeAssetId()
    if (!feeAssetId) return null
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, evmChainId])
  const feeAssetPrice =
    useAppSelector(state => selectMarketDataById(state, feeAsset?.assetId ?? ''))?.price ?? '0'

  useEffect(() => {
    debugger
    if (!request) return
    if (!wcAccountId) return
    const { account: address } = fromAccountId(wcAccountId)
    if (!(address && evmChainId && feeAsset && feeAssetPrice)) return

    const adapter = getChainAdapterManager().get(evmChainId)
    if (!adapter) return
    ;(async () => {
      const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: request.to,
        value: bnOrZero(request.value).toFixed(0),
        chainSpecific: {
          from: address,
          contractAddress: request.to,
          contractData: request.data,
        },
      })

      const initialFees: FeePrice = {
        slow: {
          fiatFee: '',
          txFee: '',
          gasPrice: '',
        },
        average: {
          fiatFee: '',
          txFee: '',
          gasPrice: '',
        },
        fast: {
          fiatFee: '',
          txFee: '',
          gasPrice: '',
        },
      }
      const result = (Object.keys(estimatedFees) as FeeDataKey[]).reduce<FeePrice>(
        (acc: FeePrice, key: FeeDataKey) => {
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(10).pow(feeAsset?.precision))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(feeAssetPrice).toPrecision()
          const gasPrice = estimatedFees[key].chainSpecific.gasPrice
          acc[key] = { txFee, fiatFee, gasPrice }
          return acc
        },
        initialFees,
      )
      setFees(result)
    })()
  }, [wcAccountId, evmChainId, feeAsset, feeAssetPrice, request])

  return { fees, feeAsset }
}
