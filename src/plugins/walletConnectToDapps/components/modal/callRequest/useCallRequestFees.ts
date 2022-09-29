import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback, useEffect, useState } from 'react'
import type { FeePrice } from 'components/Modals/Send/views/Confirm'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

export function useCallRequestFees(
  request: WalletConnectEthSendTransactionCallRequest['params'][number],
) {
  const [fees, setFees] = useState<FeePrice | undefined>({
    [FeeDataKey.Slow]: { txFee: '0.0001', fiatFee: '5.00' },
    [FeeDataKey.Average]: { txFee: '0.0001', fiatFee: '5.00' },
    [FeeDataKey.Fast]: { txFee: '0.0001', fiatFee: '5.00' },
  })

  const walletConnect = useWalletConnect()
  const address = walletConnect.bridge?.connector.accounts[0]
  const connectedChainId = walletConnect.bridge?.connector.chainId
  const fetchFees = useCallback(async () => {
    if (!address) return undefined

    const chainId = `eip155:${request.chainId ?? connectedChainId}`
    const adapter = getChainAdapterManager().get(chainId)

    const estimatedFees = await (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
      to: request.to,
      value: request.value, // bnOrZero(request.value).toFixed(0),
      chainSpecific: {
        from: address,
        contractAddress: request.to,
        contractData: request.data,
      },
    })

    // const price = bnOrZero(
    //   useAppSelector(state => selectMarketDataById(state, feeAsset.assetId)).price,
    // )

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
          .dividedBy(bn(`1e+${18 /* TODO: asset.precision */}`))
          .toPrecision()
        const fiatFee = bnOrZero(txFee).times(1200 /* TODO: price */).toPrecision()
        acc[key] = { txFee, fiatFee }
        return acc
      },
      initialFees,
    )
  }, [address, request, connectedChainId])

  useEffect(() => {
    fetchFees().then(setFees)
  }, [fetchFees])

  return fees
}
