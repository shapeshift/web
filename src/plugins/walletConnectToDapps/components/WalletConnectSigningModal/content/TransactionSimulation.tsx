import { HStack, Image, Skeleton, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { getAddress, maxUint256 } from 'viem'

import { Amount } from '@/components/Amount/Amount'
import { RawText } from '@/components/Text'
import { makeAmountOrDefault } from '@/components/TransactionHistoryRows/utils'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { ExpandableCell } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/ExpandableCell'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import { parseAssetChanges } from '@/plugins/walletConnectToDapps/utils/tenderly'
import type {
  AssetChange,
  TenderlyExposureChange,
} from '@/plugins/walletConnectToDapps/utils/tenderly/types'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { store } from '@/state/store'

type TransactionSimulationProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const TransactionSimulation: FC<TransactionSimulationProps> = ({ transaction, chainId }) => {
  const translate = useTranslate()
  const { speed } = useWatch<CustomTransactionData>()

  const { simulationQuery } = useSimulateEvmTransaction({ transaction, chainId, speed })

  const assetChanges = useMemo((): AssetChange[] => {
    if (!simulationQuery.data) return []

    return parseAssetChanges(simulationQuery.data, getAddress(transaction.from))
  }, [simulationQuery.data, transaction.from])

  const sendChanges = useMemo(
    () => assetChanges.filter(change => change.type === 'send'),
    [assetChanges],
  )

  const receiveChanges = useMemo(
    () => assetChanges.filter(change => change.type === 'receive'),
    [assetChanges],
  )

  const exposureChanges = useMemo(
    (): TenderlyExposureChange[] =>
      simulationQuery.data?.transaction.transaction_info?.exposure_changes || [],
    [simulationQuery.data?.transaction.transaction_info?.exposure_changes],
  )

  const allowanceSimulationRows = useMemo(() => {
    if (exposureChanges.length === 0) return []

    // There *may* be exposure_changes for swap Txs, but those are internal.
    // We should only display exposure changes in case we're dealing with "pure" approval Txs i.e calls to approve() or similar
    const isApprovalTx = !sendChanges.length && !receiveChanges.length

    if (!isApprovalTx) return []

    return exposureChanges.map((change, index) => {
      const symbol = change.token_info.symbol.toUpperCase()
      const logo = change.token_info.logo

      const assetId = toAssetId({
        chainId,
        assetNamespace: ASSET_NAMESPACE.erc20,
        assetReference: change.token_info.contract_address,
      })

      const asset = selectAssetById(store.getState(), assetId)
      const approvedAssetMarketData = selectMarketDataByAssetIdUserCurrency(
        store.getState(),
        assetId,
      )

      const amount = bnOrZero(change.amount)
      const isUnlimited = (() => {
        if (asset && approvedAssetMarketData) {
          const amountResult = makeAmountOrDefault(
            change.amount,
            approvedAssetMarketData,
            asset,
            'erc20',
          )
          return amountResult === 'transactionRow.parser.erc20.infinite'
        }

        // Poor man's fallback in case of no asset/market-data in store
        // not as reliable as max supply checks above but that does somehow work too
        return amount.gte(maxUint256.toString()) || amount.gt('1e18')
      })()

      return (
        <VStack key={`approval-${index}`} spacing={2} align='stretch'>
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.approveToken')}
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='bold'>
                {symbol}
              </RawText>
              {logo && <Image boxSize='20px' src={logo} borderRadius='full' />}
            </HStack>
          </HStack>
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.approveAmount')}
            </RawText>
            <HStack spacing={2}>
              {isUnlimited ? (
                <RawText fontSize='sm' fontWeight='bold'>
                  {translate('transactionRow.parser.erc20.infinite')}
                </RawText>
              ) : (
                <Amount.Crypto
                  value={change.amount}
                  symbol={symbol}
                  omitDecimalTrailingZeros
                  fontSize='sm'
                  fontWeight='bold'
                />
              )}
              {logo && <Image boxSize='20px' src={logo} borderRadius='full' />}
            </HStack>
          </HStack>
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.approveTo')}
            </RawText>
            <ExpandableCell value={change.spender} threshold={20} />
          </HStack>
        </VStack>
      )
    })
  }, [exposureChanges, sendChanges.length, receiveChanges.length, chainId, translate])

  const sendChangeRow = useMemo(() => {
    return sendChanges.map((change, index) => {
      const symbol = change.token_info.symbol.toUpperCase()
      const icon = change.token_info.logo

      return (
        <HStack key={`send-${index}`} justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.send')}
          </RawText>
          <HStack spacing={2}>
            <Amount.Crypto
              value={bnOrZero(change.amount).abs().toString()}
              symbol={symbol}
              omitDecimalTrailingZeros
              fontSize='sm'
              color='red.400'
              fontWeight='bold'
              prefix='-'
            />
            {icon && <Image boxSize='20px' src={icon} borderRadius='full' />}
          </HStack>
        </HStack>
      )
    })
  }, [sendChanges, translate])

  const receiveChangeRow = useMemo(() => {
    return receiveChanges.map((change, index) => {
      const symbol = change.token_info.symbol.toUpperCase()
      const icon = change.token_info.logo

      return (
        <HStack key={`receive-${index}`} justify='space-between' align='center' py={1}>
          <RawText fontSize='sm' color='text.subtle'>
            {translate('common.receive')}
          </RawText>
          <HStack spacing={2}>
            <Amount.Crypto
              value={change.amount}
              symbol={symbol}
              omitDecimalTrailingZeros
              fontSize='sm'
              color='green.400'
              fontWeight='bold'
              prefix='+'
            />
            {icon && <Image boxSize='20px' src={icon} borderRadius='full' />}
          </HStack>
        </HStack>
      )
    })
  }, [receiveChanges, translate])

  if (
    !simulationQuery.isLoading &&
    !(allowanceSimulationRows.length || sendChanges.length || receiveChanges.length)
  ) {
    return null
  }

  return (
    <Skeleton isLoaded={!simulationQuery.isLoading}>
      <VStack spacing={2} align='stretch'>
        {allowanceSimulationRows}
        {sendChangeRow}
        {receiveChangeRow}
      </VStack>
    </Skeleton>
  )
}
