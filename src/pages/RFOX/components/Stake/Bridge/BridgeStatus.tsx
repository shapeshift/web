import { fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, type EvmChainId } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { arbitrumBridgeApi } from 'lib/swapper/swappers/ArbitrumBridgeSwapper/endpoints'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { MultiStepStatusStep } from '../../Shared/SharedMultiStepStatus'
import { SharedMultiStepStatus } from '../../Shared/SharedMultiStepStatus'
import { StakeRoutePaths } from '../types'
import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeStatusProps = {
  confirmedQuote: RfoxBridgeQuote
}
export const BridgeStatus: React.FC<BridgeRouteProps & BridgeStatusProps> = ({
  confirmedQuote,
}) => {
  const [bridgeTxHash, setBridgeTxHash] = useState<string>()
  const [l2TxHash, setL2TxHash] = useState<string>()
  const wallet = useWallet().state.wallet
  const translate = useTranslate()
  const history = useHistory()

  const handleContinue = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const serializedBridgeTxIndex = useMemo(() => {
    if (!bridgeTxHash) return undefined

    return serializeTxIndex(
      confirmedQuote.sellAssetAccountId,
      bridgeTxHash,
      fromAccountId(confirmedQuote.sellAssetAccountId).account,
    )
  }, [bridgeTxHash, confirmedQuote.sellAssetAccountId])

  const serializedL2TxIndex = useMemo(() => {
    if (!l2TxHash) return undefined

    return serializeTxIndex(
      confirmedQuote.buyAssetAccountId,
      l2TxHash,
      fromAccountId(confirmedQuote.buyAssetAccountId).account,
    )
  }, [confirmedQuote.buyAssetAccountId, l2TxHash])

  const handleGoBack = useCallback(() => {
    history.push(BridgeRoutePaths.Confirm)
  }, [history])

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const accountNumberFilter = useMemo(
    () => ({ assetId: confirmedQuote.sellAssetId, accountId: confirmedQuote.sellAssetAccountId }),
    [confirmedQuote.sellAssetAccountId, confirmedQuote.sellAssetId],
  )
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const { data: quote } = useQuery({
    ...reactQueries.swapper.arbitrumBridgeTradeQuote({
      sellAsset: sellAsset!,
      buyAsset: buyAsset!,
      chainId: (sellAsset?.chainId ?? '') as EvmChainId,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: confirmedQuote.bridgeAmountCryptoBaseUnit,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      allowMultiHop: true,
      receiveAddress: fromAccountId(confirmedQuote.buyAssetAccountId).account,
      sendAddress: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      accountNumber: accountNumber!,
      wallet: wallet!,
    }),
    enabled: Boolean(sellAsset && buyAsset && accountNumber !== undefined && wallet),
  })

  const { mutateAsync: handleBridge } = useMutation({
    mutationFn: async () => {
      if (!(quote && quote.isOk() && wallet && sellAsset && accountNumber !== undefined)) return
      const tradeQuote = quote.unwrap()

      const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

      const unsignedTx = await arbitrumBridgeApi.getUnsignedEvmTransaction!({
        tradeQuote,
        chainId: sellAsset!.chainId as EvmChainId,
        from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
        stepIndex: 0,
        supportsEIP1559,
        slippageTolerancePercentageDecimal: '0',
      })

      const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        adapter,
        data: unsignedTx.data,
        value: unsignedTx.value,
        to: unsignedTx.to,
        wallet,
      })

      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      return txId
    },
    onSuccess: (txHash: string | undefined) => {
      if (!txHash) return
      setBridgeTxHash(txHash)
    },
  })

  const { data: tradeStatus } = useQuery({
    ...reactQueries.swapper.arbitrumBridgeTradeStatus(bridgeTxHash ?? '', sellAsset?.chainId ?? ''),
    enabled: Boolean(bridgeTxHash && sellAsset),
    refetchInterval: 1000,
  })

  useEffect(() => {
    if (!tradeStatus) return
    if (tradeStatus.message === 'L2 Tx Pending' || tradeStatus.status === TxStatus.Confirmed) {
      setL2TxHash(tradeStatus.buyTxHash)
    }
  }, [tradeStatus])

  const steps: MultiStepStatusStep[] = useMemo(() => {
    if (!(sellAsset && buyAsset)) return []

    return [
      {
        asset: sellAsset,
        headerCopy: translate('common.sendAmountAsset', {
          amount: bridgeAmountCryptoPrecision,
          asset: sellAsset.symbol,
        }),
        isActionable: true,
        onSignAndBroadcast: handleBridge,
        serializedTxIndex: serializedBridgeTxIndex,
        txHash: bridgeTxHash,
      },
      {
        asset: buyAsset,
        headerCopy: 'Bridge Funds',
        isActionable: false,
        serializedTxIndex: serializedL2TxIndex,
        txHash: l2TxHash,
      },
    ]
  }, [
    bridgeAmountCryptoPrecision,
    bridgeTxHash,
    buyAsset,
    handleBridge,
    l2TxHash,
    sellAsset,
    serializedBridgeTxIndex,
    serializedL2TxIndex,
    translate,
  ])

  return (
    <SharedMultiStepStatus
      onBack={handleGoBack}
      confirmedQuote={confirmedQuote}
      onContinue={handleContinue}
      steps={steps}
    />
  )
}
