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
import { bchChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
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
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useLendingPositionData } from 'pages/Lending/hooks/useLendingPositionData'
import { useLendingQuoteOpenQuery } from 'pages/Lending/hooks/useLendingQuoteQuery'
import { useQuoteEstimatedFeesQuery } from 'pages/Lending/hooks/useQuoteEstimatedFees'
import { getThorchainLendingPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { waitForThorchainUpdate } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
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
}

export const BorrowConfirm = ({
  collateralAssetId,
  depositAmount,
  collateralAccountId,
  borrowAccountId,
  borrowAsset,
}: BorrowConfirmProps) => {
  const {
    state: { wallet },
  } = useWallet()

  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLoanOpenPending, setIsLoanOpenPending] = useState(false)

  const borrowAssetId = borrowAsset?.assetId ?? ''
  const history = useHistory()
  const translate = useTranslate()
  const collateralAsset = useAppSelector(state => selectAssetById(state, collateralAssetId))
  const debtAsset = useAppSelector(state => selectAssetById(state, borrowAssetId))
  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )
  const { refetch: refetchLendingPositionData } = useLendingPositionData({
    assetId: collateralAssetId,
    accountId: collateralAccountId,
  })

  useEffect(() => {
    // don't start polling until we have a tx
    if (!txHash) return

    setIsLoanOpenPending(true)
    ;(async () => {
      // TODO(gomes): we might want to change heuristics here - this takes forever to be truthy, while the loan open itself is reflected way earlier, at least for ETH
      await waitForThorchainUpdate(txHash, queryClient).promise
      setIsLoanOpenPending(false)
      await refetchLendingPositionData()
    })()
  }, [refetchLendingPositionData, txHash])

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
      isLoanOpenPending,
    }),
    [
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId,
      depositAmount,
      isLoanOpenPending,
    ],
  )
  const {
    data,
    isLoading: isLendingQuoteLoading,
    isError: isLendingQuoteError,
  } = useLendingQuoteOpenQuery(useLendingQuoteQueryArgs)

  const lendingQuoteData = isLendingQuoteError ? null : data

  const chainAdapter = getChainAdapterManager().get(fromAssetId(collateralAssetId).chainId)

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const collateralAccountFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountFilter),
  )
  const collateralAccountType = collateralAccountMetadata?.accountType
  const collateralBip44Params = collateralAccountMetadata?.bip44Params

  const getFromAddress = useCallback(async () => {
    if (!(wallet && chainAdapter && collateralBip44Params)) return null

    // TODO(gomes): unify me across savers/lending along with other utils
    return isUtxoChainId(fromAccountId(collateralAccountId).chainId)
      ? await getThorchainLendingPosition({
          accountId: collateralAccountId,
          assetId: collateralAssetId,
        })
          .then(position => {
            const { chainId } = fromAssetId(collateralAssetId)
            if (!position) throw new Error(`No position found for assetId: ${collateralAssetId}`)
            const { owner } = position
            return chainId === bchChainId ? `bitcoincash:${owner}` : owner
          })
          .catch(async () => {
            const firstReceiveAddress = await chainAdapter.getAddress({
              wallet,
              accountNumber: collateralBip44Params.accountNumber,
              accountType: collateralAccountType,
              index: 0,
            })

            return firstReceiveAddress
          })
      : fromAccountId(collateralAccountId).account
  }, [
    wallet,
    chainAdapter,
    collateralBip44Params,
    collateralAccountType,
    collateralAccountId,
    collateralAssetId,
  ])

  const { data: estimatedFeesData, isLoading: isEstimatedFeesDataLoading } =
    useQuoteEstimatedFeesQuery({
      collateralAssetId,
      collateralAccountId,
      borrowAccountId,
      borrowAssetId: borrowAsset?.assetId ?? '',
      depositAmountCryptoPrecision: depositAmount ?? '0',
    })

  const handleDeposit = useCallback(async () => {
    if (
      !(
        collateralAssetId &&
        depositAmount &&
        wallet &&
        chainAdapter &&
        lendingQuoteData &&
        estimatedFeesData?.estimatedFees
      )
    )
      return
    const from = await getFromAddress()

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
      throw new Error('Error sending THORCHain savers Txs')
    }

    setTxHash(maybeTxId)

    return maybeTxId
  }, [
    collateralAssetId,
    depositAmount,
    wallet,
    chainAdapter,
    lendingQuoteData,
    estimatedFeesData,
    getFromAddress,
    collateralAccountId,
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
                <Skeleton isLoaded={!isLendingQuoteLoading}>
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
            <Skeleton isLoaded={!isLendingQuoteLoading}>
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
            </Skeleton>
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
                <Skeleton isLoaded={!(isEstimatedFeesDataLoading || isLendingQuoteLoading)}>
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
            borrowAssetId={borrowAssetId}
            borrowAccountId={borrowAccountId}
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
