import {
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useMutationState } from '@tanstack/react-query'
import { utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import { handleSend } from 'components/Modals/Send/utils'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioAccountMetadataByAccountId,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'

type BorrowConfirmProps = {
  collateralAssetId: AssetId
  depositAmount: string | null
  collateralAccountId: AccountId
  borrowAccountId: AccountId
  borrowAsset: Asset | null
  txId: string | null
  setTxid: (txId: string | null) => void
}

export const BorrowConfirm = ({
  collateralAssetId,
  depositAmount,
  collateralAccountId,
  borrowAccountId,
  borrowAsset,
  txId,
  setTxid,
}: BorrowConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const borrowAssetId = borrowAsset?.assetId ?? ''
  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: (_txId: string) =>
      // Ensuring we wait for the outbound Tx to exist
      // Else, the position will update before the borrowed asset is received and users will be confused
      waitForThorchainUpdate({ txId: _txId, skipOutbound: false }).promise,
  })

  const [isLoanPending, setIsLoanPending] = useState(false)
  const lendingMutationStatus = useMutationState({
    filters: { mutationKey: [txId] },
    select: mutation => mutation.state.status,
  })

  const loanTxStatus = useMemo(() => lendingMutationStatus?.[0], [lendingMutationStatus])

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txId) return
    ;(async () => {
      await mutateAsync(txId)
      setIsLoanPending(false)
    })()
  }, [mutateAsync, txId])

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  const useLendingQuoteQueryArgs = useMemo(
    () => ({
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId,
      depositAmountCryptoPrecision: depositAmount ?? '0',
    }),
    [collateralAssetId, collateralAccountId, borrowAccountId, borrowAssetId, depositAmount],
  )
  const {
    data: lendingQuoteData,
    isSuccess: isLendingQuoteSuccess,
    isLoading: isLendingQuoteLoading,
    isError: isLendingQuoteError,
  } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const chainAdapter = getChainAdapterManager().get(fromAssetId(collateralAssetId).chainId)

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const {
    data: estimatedFeesData,
    isSuccess: isEstimatedFeesDataSuccess,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
  } = useQuoteEstimatedFeesQuery({
    collateralAssetId,
    collateralAccountId,
    borrowAccountId,
    borrowAssetId: borrowAsset?.assetId ?? '',
    depositAmountCryptoPrecision: depositAmount ?? '0',
  })

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )
  const handleConfirm = useCallback(async () => {
    if (loanTxStatus === 'pending' || loanTxStatus === 'success') {
      // Reset values when going back to input step
      setTxid(null)
      return history.push(BorrowRoutePaths.Input)
    }

    if (
      !(
        collateralAssetId &&
        depositAmount &&
        wallet &&
        chainAdapter &&
        isLendingQuoteSuccess &&
        isEstimatedFeesDataSuccess &&
        collateralAccountMetadata
      )
    )
      return

    setIsLoanPending(true)

    const from = await getThorchainFromAddress({
      accountId: collateralAccountId,
      getPosition: getThorchainLendingPosition,
      assetId: collateralAssetId,
      wallet,
      accountMetadata: collateralAccountMetadata,
    })
    if (!from) throw new Error(`Could not get send address for AccountId ${collateralAccountId}`)
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const { estimatedFees } = estimatedFeesData
    const maybeTxId = await (() => {
      // TODO(gomes): isTokenDeposit. This doesn't exist yet but may in the future.
      const sendInput: SendInput = {
        cryptoAmount: depositAmount ?? '0',
        assetId: collateralAssetId,
        to: lendingQuoteData.quoteInboundAddress,
        from,
        sendMax: false,
        accountId: collateralAccountId,
        memo: supportedEvmChainIds.includes(fromAssetId(collateralAssetId).chainId)
          ? utils.hexlify(utils.toUtf8Bytes(lendingQuoteData.quoteMemo))
          : lendingQuoteData.quoteMemo,
        amountFieldError: '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: lendingQuoteData.quoteInboundAddress,
      }

      if (!sendInput) throw new Error('Error building send input')

      return handleSend({ sendInput, wallet })
    })()

    if (!maybeTxId) {
      throw new Error('Error sending THORCHain lending Txs')
    }

    setTxid(maybeTxId)

    return maybeTxId
  }, [
    loanTxStatus,
    collateralAssetId,
    depositAmount,
    wallet,
    chainAdapter,
    isLendingQuoteSuccess,
    isEstimatedFeesDataSuccess,
    collateralAccountMetadata,
    collateralAccountId,
    estimatedFeesData,
    setTxid,
    history,
    lendingQuoteData?.quoteInboundAddress,
    lendingQuoteData?.quoteMemo,
    selectedCurrency,
  ])

  if (!depositAmount) return null

  return (
    <SlideTransition>
      <Flex flexDir='column' width='full'>
        <CardHeader>
          <WithBackButton handleBack={handleBack}>
            <Heading as='h5' textAlign='center'>
              <Text translation='Confirm' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <Stack spacing={0} divider={divider}>
          <AssetToAsset
            buyIcon={debtAsset?.icon ?? ''}
            sellIcon={collateralAsset?.icon ?? ''}
            buyColor={debtAsset?.color ?? ''}
            sellColor={collateralAsset?.color ?? ''}
            status={TxStatus.Unknown}
            px={6}
            mb={4}
          />
          <Stack py={4} spacing={4} px={6} fontSize='sm' fontWeight='medium'>
            <RawText fontWeight='bold'>{translate('lending.transactionInfo')}</RawText>
            <Row>
              <Row.Label>Send</Row.Label>
              <Row.Value textAlign='right'>
                <Skeleton isLoaded={isLendingQuoteSuccess}>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto value={depositAmount} symbol={collateralAsset?.symbol ?? ''} />
                    <Amount.Fiat
                      color='text.subtle'
                      value={bnOrZero(depositAmount)
                        .times(collateralAssetMarketData?.price ?? '0')
                        .toString()}
                      prefix='≈'
                    />
                  </Stack>
                </Skeleton>
              </Row.Value>
            </Row>
            <Skeleton isLoaded={isLendingQuoteSuccess}>
              <Row>
                <Row.Label>{translate('common.receive')}</Row.Label>
                <Row.Value textAlign='right'>
                  <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                    <Amount.Crypto
                      // Actually defined at display time, see isLoaded above
                      value={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
                      symbol={debtAsset?.symbol ?? ''}
                    />
                    <Amount.Fiat
                      color='text.subtle'
                      // Actually defined at display time, see isLoaded above
                      value={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
                      prefix='≈'
                    />
                  </Stack>
                </Row.Value>
              </Row>
            </Skeleton>
            <Row fontSize='sm' fontWeight='medium'>
              <HelperTooltip label={translate('lending.quote.feesPlusSlippage')}>
                <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Skeleton isLoaded={isLendingQuoteSuccess}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={lendingQuoteData?.quoteTotalFeesFiatUserCurrency ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={isEstimatedFeesDataSuccess && isLendingQuoteSuccess}>
                  {/* Actually defined at display time, see isLoaded above */}
                  <Amount.Fiat value={estimatedFeesData?.txFeeFiat ?? '0'} />
                </Skeleton>
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            borderTopWidth={0}
            mt={0}
            collateralAssetId={collateralAssetId}
            collateralAccountId={collateralAccountId}
            debtOccuredAmountUserCurrency={lendingQuoteData?.quoteDebtAmountUserCurrency ?? '0'}
            borrowAssetId={borrowAssetId}
            borrowAccountId={borrowAccountId}
            depositAmountCryptoPrecision={depositAmount ?? '0'}
          />
          <CardFooter px={4} py={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              onClick={handleConfirm}
              isLoading={
                loanTxStatus === 'pending' || isEstimatedFeesDataLoading || isLendingQuoteLoading
              }
              disabled={
                loanTxStatus === 'pending' ||
                isLoanPending ||
                isEstimatedFeesDataLoading ||
                isEstimatedFeesDataError ||
                isLendingQuoteLoading ||
                isLendingQuoteError
              }
            >
              {translate(
                loanTxStatus === 'success' ? 'lending.borrowAgain' : 'lending.confirmAndBorrow',
              )}
            </Button>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
