import { ArrowBackIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useHistory } from 'react-router'
import { encodeFunctionData, getAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { Row, type RowProps } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { StakeRoutePaths } from '../types'
import type { RfoxBridgeQuote } from './types'
import { BridgeRoutePaths, type BridgeRouteProps } from './types'

type BridgeConfirmProps = {
  confirmedQuote: RfoxBridgeQuote
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const BridgeConfirm: FC<BridgeRouteProps & BridgeConfirmProps> = ({ confirmedQuote }) => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [approvalTxHash, setApprovalTxHash] = useState<string>()

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.sellAssetId).chainId),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const sellAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.sellAssetId),
  )

  const bridgeAmountUserCurrency = useMemo(
    () =>
      bnOrZero(bridgeAmountCryptoPrecision).times(sellAssetMarketDataUserCurrency.price).toFixed(),
    [bridgeAmountCryptoPrecision, sellAssetMarketDataUserCurrency.price],
  )

  const accountNumberFilter = useMemo(
    () => ({ assetId: confirmedQuote.sellAssetId, accountId: confirmedQuote.sellAssetAccountId }),
    [confirmedQuote.sellAssetAccountId, confirmedQuote.sellAssetId],
  )
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberFilter),
  )

  const { data: quote, isLoading: isBridgeQuoteLoading } = useQuery({
    ...reactQueries.swapper.arbitrumBridgeTradeQuote({
      sellAsset: sellAsset!,
      buyAsset: buyAsset!,
      chainId: sellAsset!.chainId as EvmChainId,
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

  const allowanceContract = useMemo(() => {
    if (!quote || quote.isErr()) return

    const tradeQuote = quote.unwrap()

    return tradeQuote.steps[0].allowanceContract
  }, [quote])

  const { data: allowanceData, isLoading: isAllowanceDataLoading } = useAllowance({
    assetId: confirmedQuote.sellAssetId,
    spender: allowanceContract,
    from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
  })

  const isApprovalRequired = useMemo(
    () => bnOrZero(allowanceData).lt(confirmedQuote.bridgeAmountCryptoBaseUnit),
    [allowanceData, confirmedQuote.bridgeAmountCryptoBaseUnit],
  )

  const approvalCallData = useMemo(() => {
    if (!allowanceContract) return

    return encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: [getAddress(allowanceContract), BigInt(confirmedQuote.bridgeAmountCryptoBaseUnit)],
    })
  }, [allowanceContract, confirmedQuote.bridgeAmountCryptoBaseUnit])

  const {
    mutateAsync: sendApprovalTx,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
    isIdle: isApprovalMutationIdle,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: confirmedQuote.sellAssetId,
      spender: allowanceContract!,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      amount: confirmedQuote.bridgeAmountCryptoBaseUnit,
      wallet,
      accountNumber,
    }),
    onSuccess: (txHash: string) => {
      setApprovalTxHash(txHash)
      toast({
        title: translate('modals.send.transactionSent'),
        description: (
          <Text>
            {feeAsset?.explorerTxLink && (
              <Link href={`${feeAsset.explorerTxLink}${txHash}`} isExternal>
                {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
              </Link>
            )}
          </Text>
        ),
        status: 'success',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    },
  })

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        isApprovalMutationIdle &&
          isApprovalRequired &&
          feeAsset &&
          feeAssetMarketData &&
          wallet &&
          accountNumber !== undefined,
      ),
    [
      accountNumber,
      feeAsset,
      feeAssetMarketData,
      isApprovalMutationIdle,
      isApprovalRequired,
      wallet,
    ],
  )

  const { data: approvalFees, isLoading: isGetApprovalFeesLoading } = useQuery({
    ...reactQueries.common.evmFees({
      value: '0',
      accountNumber: accountNumber!, // see isGetApprovalFeesEnabled
      feeAsset: feeAsset!, // see isGetApprovalFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetApprovalFeesEnabled
      to: fromAssetId(confirmedQuote.sellAssetId).assetReference,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      data: approvalCallData!,
      wallet: wallet!, // see isGetApprovalFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetApprovalFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetApprovalFeesEnabled ? 15_000 : false,
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!approvalTxHash) return ''
    return serializeTxIndex(
      confirmedQuote.sellAssetAccountId,
      approvalTxHash,
      fromAccountId(confirmedQuote.sellAssetAccountId).account,
    )
  }, [approvalTxHash, confirmedQuote.sellAssetAccountId])

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))

  const handleApprove = useCallback(() => sendApprovalTx(), [sendApprovalTx])

  const isApprovalTxPending = useMemo(
    () =>
      isApprovalMutationPending ||
      (isApprovalMutationSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalMutationPending, isApprovalMutationSuccess],
  )

  const isApprovalTxSuccess = useMemo(
    () => approvalTx?.status === TxStatus.Confirmed,
    [approvalTx?.status],
  )

  // The approval Tx may be confirmed, but that's not enough to know we're ready to bridge
  // Allowance then needs to be succesfully refetched - failure to wait for it will result in jumpy states between
  // the time the Tx is confirmed, and the time the allowance is succesfully refetched
  // This allows us to detect such transition state
  const isTransitioning = useMemo(() => {
    // If we don't have a success Tx, we know we're not transitioning
    if (!isApprovalTxSuccess) return false
    // We have a success approval Tx, but approval is still required, meaning we haven't re-rendered with the updated allowance just yet
    if (isApprovalRequired) return true

    // Allowance has been updated, we've finished transitioning
    return false
  }, [isApprovalRequired, isApprovalTxSuccess])

  useEffect(() => {
    if (!allowanceContract) return
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          confirmedQuote.sellAssetId,
          allowanceContract,
          fromAccountId(confirmedQuote.sellAssetAccountId).account,
        ),
      )
    })()
  }, [
    approvalTx,
    isApprovalTxPending,
    queryClient,
    allowanceContract,
    confirmedQuote.sellAssetId,
    confirmedQuote.sellAssetAccountId,
  ])

  const networkFeeCryptoPrecision = useMemo(() => {
    if (!quote || quote.isErr()) return null
    return fromBaseUnit(
      bnOrZero(quote.unwrap().steps[0].feeData.networkFeeCryptoBaseUnit),
      sellAsset?.precision ?? 0,
    )
  }, [quote, sellAsset])

  const networkFeeUserCurrency = useMemo(() => {
    if (!networkFeeCryptoPrecision) return null
    return bnOrZero(networkFeeCryptoPrecision).times(feeAssetMarketData.price).toFixed()
  }, [feeAssetMarketData.price, networkFeeCryptoPrecision])

  const feeAssetBalanceFilter = useMemo(
    () => ({
      accountId: confirmedQuote.sellAssetAccountId,
      assetId: feeAsset?.assetId,
    }),
    [confirmedQuote.sellAssetAccountId, feeAsset?.assetId],
  )
  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, feeAssetBalanceFilter),
  )

  const hasEnoughFeeBalance = useMemo(() => {
    // Fees loading, we don't know what we don't know
    if (isBridgeQuoteLoading || isGetApprovalFeesLoading) return true
    if (bnOrZero(feeAssetBalanceCryptoPrecision).isZero()) return false

    const fees = (() => {
      if (approvalFees) return approvalFees
      if (quote?.isOk()) return quote?.unwrap().steps[0].feeData
    })()

    const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(feeAssetBalanceCryptoPrecision, feeAsset?.precision ?? 0),
    )

    if (!hasEnoughFeeBalance) return false

    return true
  }, [
    isBridgeQuoteLoading,
    isGetApprovalFeesLoading,
    feeAssetBalanceCryptoPrecision,
    feeAsset?.precision,
    approvalFees,
    quote,
  ])

  const bridgeCard = useMemo(() => {
    if (!(sellAsset && buyAsset)) return null
    return (
      <>
        <Card
          display='flex'
          alignItems='center'
          justifyContent='space-around'
          flexDir='row'
          gap={4}
          py={6}
          px={4}
        >
          <Stack alignItems='center'>
            <AssetIcon size='sm' assetId={sellAsset?.assetId} />
            <Stack textAlign='center' spacing={0}>
              <Amount.Crypto value={bridgeAmountCryptoPrecision} symbol={sellAsset.symbol} />
              <Amount.Fiat fontSize='sm' color='text.subtle' value={bridgeAmountUserCurrency} />
            </Stack>
          </Stack>
          <Stack alignItems='center'>
            <AssetIcon size='sm' assetId={buyAsset?.assetId} />
            <Stack textAlign='center' spacing={0}>
              <Amount.Crypto value={bridgeAmountCryptoPrecision} symbol={buyAsset.symbol} />
              <Amount.Fiat fontSize='sm' color='text.subtle' value={bridgeAmountUserCurrency} />
            </Stack>
          </Stack>
        </Card>
      </>
    )
  }, [sellAsset, buyAsset, bridgeAmountCryptoPrecision, bridgeAmountUserCurrency])

  const errorCopy = useMemo(() => {
    if (!hasEnoughFeeBalance)
      return translate('common.insufficientAmountForGas', {
        assetSymbol: feeAsset?.symbol,
        chainSymbol: getChainShortName(feeAsset?.chainId as KnownChainIds),
      })
  }, [feeAsset?.chainId, feeAsset?.symbol, hasEnoughFeeBalance, translate])

  const submitCopy = useMemo(() => {
    if (errorCopy) return errorCopy

    return translate(isApprovalRequired ? 'common.approve' : 'RFOX.bridgeAndConfirm')
  }, [errorCopy, isApprovalRequired, translate])

  const handleSubmit = useCallback(() => {
    history.push({ pathname: BridgeRoutePaths.Status, state: confirmedQuote })
  }, [confirmedQuote, history])

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>
          {bridgeCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{sellAsset?.name ?? ''}</Row.Label>
                <Row.Value>{bridgeAmountCryptoPrecision}</Row.Value>
              </CustomRow>
            </TimelineItem>
            {isGetApprovalFeesEnabled && (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('common.approvalFee')}</Row.Label>
                  <Skeleton isLoaded={Boolean(!isGetApprovalFeesLoading && approvalFees)}>
                    <Row.Value>
                      <Amount.Fiat value={approvalFees?.txFeeFiat ?? '0'} />
                    </Row.Value>
                  </Skeleton>
                </CustomRow>
              </TimelineItem>
            )}
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!!networkFeeUserCurrency}>
                    <Row.Value>
                      <Amount.Fiat value={networkFeeUserCurrency ?? '0'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{buyAsset?.name ?? ''}</Row.Label>
                <Row.Value>{bridgeAmountCryptoPrecision}</Row.Value>
              </CustomRow>
            </TimelineItem>
          </Timeline>
        </Stack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button
          size='lg'
          mx={-2}
          colorScheme={errorCopy ? 'red' : 'blue'}
          isLoading={
            isAllowanceDataLoading ||
            isGetApprovalFeesLoading ||
            isApprovalTxPending ||
            isTransitioning ||
            isBridgeQuoteLoading
          }
          isDisabled={!hasEnoughFeeBalance || isAllowanceDataLoading || isBridgeQuoteLoading}
          onClick={isApprovalRequired ? handleApprove : handleSubmit}
        >
          {submitCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
