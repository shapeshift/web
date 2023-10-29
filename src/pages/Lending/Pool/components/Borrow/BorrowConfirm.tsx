import { Button, CardFooter, CardHeader, Divider, Flex, Heading, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { utils } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { AssetToAsset } from 'components/MultiHopTrade/components/TradeConfirm/AssetToAsset'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useLendingQuoteQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { waitForThorchainUpdate } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
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
  onDepositAmountChange: (value: string) => void
}

export const BorrowConfirm = ({ collateralAssetId, depositAmount }: BorrowConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLoanOpenPending, setIsLoanOpenPending] = useState(false)

  const borrowAssetId = btcAssetId // TODO(gomes): programmatic
  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  // TODO(gomes): programmatic
  const depositAccountId =
    useAppSelector(state =>
      selectFirstAccountIdByChainId(state, fromAssetId(collateralAssetId).chainId),
    ) ?? ''
  const depositAccountFilter = useMemo(() => ({ accountId: depositAccountId }), [depositAccountId])
  const depositAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, depositAccountFilter),
  )

  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: depositAccountId,
  })

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txHash) return

    setIsLoanOpenPending(true)
    ;(async () => {
      await waitForThorchainUpdate(txHash).promise
      setIsLoanOpenPending(false)
      await refetchLendingPositionData()
    })()
  }, [refetchLendingPositionData, txHash])

  const handleBack = useCallback(() => {
    history.push(BorrowRoutePaths.Input)
  }, [history])
  const divider = useMemo(() => <Divider />, [])

  // TODO(gomes): accept enabled as prop and pass it down as _enabled
  // so we have a safety to not refetch quotes while borrow is pending
  // perhaps a shared react-query mutation hook would make sense in handleSend(), so we have a way to introspect pending status
  // from input components and disable inputs as well?
  const { data: lendingQuoteData, isLoading: isLendingQuoteLoading } = useLendingQuoteQuery({
    collateralAssetId,
    borrowAssetId,
    depositAmountCryptoPrecision: depositAmount ?? '0',
  })

  const chainAdapter = getChainAdapterManager().get(fromAssetId(collateralAssetId).chainId)

  const depositAccountType = depositAccountMetadata?.accountType
  const depositBip44Params = depositAccountMetadata?.bip44Params

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  // TODO(gomes): handle error (including trading halted) and loading states here
  const handleDeposit = useCallback(async () => {
    if (
      !(
        collateralAssetId &&
        depositAmount &&
        wallet &&
        supportsETH(wallet) &&
        chainAdapter &&
        lendingQuoteData
      )
    )
      return
    const supportedEvmChainIds = getSupportedEvmChainIds()
    const estimatedFees = await estimateFees({
      cryptoAmount: depositAmount,
      assetId: collateralAssetId,
      from: fromAccountId(depositAccountId).account, // TODO(gomes): handle UTXOs
      memo: supportedEvmChainIds.includes(fromAssetId(collateralAssetId).chainId)
        ? utils.hexlify(utils.toUtf8Bytes(lendingQuoteData.quoteMemo))
        : lendingQuoteData.quoteMemo,
      to: lendingQuoteData.quoteInboundAddress,
      sendMax: false,
      accountId: depositAccountId,
      contractAddress: undefined,
    })

    // @ts-ignore
    estimatedFees.fast.chainSpecific.gasLimit = '22000' // TODO(gomes): figure out why this estimates to 21000 currently

    const maybeTxId = await (async () => {
      // TODO(gomes): isTokenDeposit. This doesn't exist yet but may in the future.
      // TODO(gomes): isUtxoChainId as well
      const sendInput: SendInput = {
        cryptoAmount: depositAmount ?? '0',
        assetId: collateralAssetId,
        to: lendingQuoteData.quoteInboundAddress,
        from: fromAccountId(depositAccountId).account, // TODO(gomes): support UTXOs as well, this is just the first naive implementation without UTXO support
        sendMax: false,
        accountId: depositAccountId,
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
      throw new Error('Error sending THORCHain savers Txs')
    }

    setTxHash(maybeTxId)

    return maybeTxId
  }, [
    chainAdapter,
    collateralAssetId,
    depositAccountId,
    depositAmount,
    lendingQuoteData,
    selectedCurrency,
    wallet,
  ])

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
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto value='1' symbol={collateralAsset?.symbol ?? ''} />
                  <Amount.Fiat
                    color='text.subtle'
                    value={bnOrZero(depositAmount)
                      .times(collateralAssetMarketData?.price ?? '0')
                      .toString()}
                    prefix='≈'
                  />
                </Stack>
              </Row.Value>
            </Row>
            <Row>
              <Row.Label>{translate('common.receive')}</Row.Label>
              <Row.Value textAlign='right'>
                <Stack spacing={1} flexDir='row' flexWrap='wrap'>
                  <Amount.Crypto
                    value={lendingQuoteData?.quoteBorrowedAmountCryptoPrecision ?? '0'}
                    symbol={debtAsset?.symbol ?? ''}
                  />
                  <Amount.Fiat
                    color='text.subtle'
                    value={lendingQuoteData?.quoteBorrowedAmountUserCurrency ?? '0'}
                    prefix='≈'
                  />
                </Stack>
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <HelperTooltip label='tbd'>
                <Row.Label>{translate('common.feesPlusSlippage')}</Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Amount.Fiat value={lendingQuoteData?.quoteTotalFeesFiatUserCurrency ?? '0'} />
              </Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Amount.Fiat value='TODO' />
              </Row.Value>
            </Row>
          </Stack>
          <LoanSummary
            borderTopWidth={0}
            mt={0}
            collateralAssetId={collateralAssetId}
            borrowAssetId={borrowAssetId}
            depositAmountCryptoPrecision={depositAmount ?? '0'}
          />
          <CardFooter px={4} py={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              onClick={handleDeposit}
              isLoading={isLoanOpenPending}
              disabled={isLoanOpenPending}
            >
              {translate('lending.confirmAndBorrow')}
            </Button>
          </CardFooter>
        </Stack>
      </Flex>
    </SlideTransition>
  )
}
