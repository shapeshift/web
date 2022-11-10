import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export function useCallRequestFees(
  request: WalletConnectEthSendTransactionCallRequest['params'][number],
) {
  const [fees, setFees] = useState<FeePrice | undefined>()

  const walletConnect = useWalletConnect()
  const address = walletConnect.bridge?.connector.accounts[0]
  const connectedChainId = walletConnect.bridge?.connector.chainId
  const assets = useAppSelector(selectAssets)
  const evmChainId = `${CHAIN_NAMESPACE.Evm}:${request.chainId ?? connectedChainId}`

  const feeAsset = useMemo(() => {
    const feeAssetId = getChainAdapterManager().get(evmChainId)?.getFeeAssetId()
    if (!feeAssetId) return null
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, evmChainId])
  const price = useAppSelector(state => selectMarketDataById(state, feeAsset?.assetId ?? '')).price
  const fetchFees = useCallback(async () => {
    if (!(address && evmChainId && feeAsset && price)) return undefined

    const adapter = getChainAdapterManager().get(evmChainId)

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
      },
      average: {
        fiatFee: '',
        txFee: '',
      },
      fast: {
        fiatFee: '',
        txFee: '',
      },
    }
    return (Object.keys(estimatedFees) as FeeDataKey[]).reduce<FeePrice>(
      (acc: FeePrice, key: FeeDataKey) => {
        const txFee = bnOrZero(estimatedFees[key].txFee)
          .dividedBy(bn(`1e+${feeAsset?.precision}`))
          .toPrecision()
        const fiatFee = bnOrZero(txFee).times(price).toPrecision()
        acc[key] = { txFee, fiatFee }
        return acc
      },
      initialFees,
    )
  }, [address, evmChainId, feeAsset, price, request.to, request.value, request.data])

  useEffect(() => {
    fetchFees().then(setFees)
  }, [fetchFees])

  return { fees, feeAsset }
}
