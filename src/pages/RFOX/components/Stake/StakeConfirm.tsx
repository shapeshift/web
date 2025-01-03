import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import { getRfoxProxyContract, selectStakingBalance } from 'pages/RFOX/helpers'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { useRfoxStake } from './hooks/useRfoxStake'
import type { RfoxStakingQuote, StakeRouteProps } from './types'
import { StakeRoutePaths } from './types'

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

type StakeConfirmProps = {
  confirmedQuote: RfoxStakingQuote
  stakeTxid: string | undefined
  setStakeTxid: (txId: string) => void
}
export const StakeConfirm: React.FC<StakeConfirmProps & StakeRouteProps> = ({
  stakeTxid,
  setStakeTxid,
  confirmedQuote,
}) => {
  const queryClient = useQueryClient()
  const history = useHistory()
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const stakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.stakingAssetId).chainId),
  )
  const stakingAssetFeeAssetBalanceFilter = useMemo(
    () => ({
      accountId: confirmedQuote.stakingAssetAccountId,
      assetId: stakingAssetFeeAsset?.assetId,
    }),
    [confirmedQuote.stakingAssetAccountId, stakingAssetFeeAsset?.assetId],
  )
  const stakingAssetFeeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, stakingAssetFeeAssetBalanceFilter),
  )
  const stakingAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.stakingAssetId),
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )

  const stakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakeAmountUserCurrency = useMemo(
    () =>
      bnOrZero(stakingAmountCryptoPrecision)
        .times(stakingAssetMarketDataUserCurrency.price)
        .toFixed(),
    [stakingAmountCryptoPrecision, stakingAssetMarketDataUserCurrency.price],
  )

  const {
    approvalFeesQuery: {
      data: approvalFees,
      isLoading: isGetApprovalFeesLoading,
      isSuccess: isGetApprovalFeesSuccess,
    },
    isApprovalRequired,
    approvalMutation: {
      mutateAsync: handleApprove,
      isPending: isApprovalMutationPending,
      isSuccess: isApprovalMutationSuccess,
    },
    allowanceQuery: { isLoading: isAllowanceDataLoading },
    stakeFeesQuery: {
      data: stakeFees,
      isLoading: isStakeFeesLoading,
      isSuccess: isStakeFeesSuccess,
    },
    approvalTx,
    stakeMutation: {
      mutateAsync: handleStake,
      isPending: isStakeMutationPending,
      isSuccess: isStakeMutationSuccess,
    },
  } = useRfoxStake({
    amountCryptoBaseUnit: confirmedQuote.stakingAmountCryptoBaseUnit,
    runeAddress: confirmedQuote.runeAddress,
    stakingAssetId: confirmedQuote.stakingAssetId,
    stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
    // Assume true at confirm since already validated
    hasEnoughBalance: true,
    // We don't have access to form context anymore at this stage
    methods: undefined,
    setStakeTxid,
  })

  const {
    data: userStakingBalanceOfCryptoBaseUnit,
    isSuccess: isUserStakingBalanceOfCryptoBaseUnitSuccess,
  } = useStakingInfoQuery({
    stakingAssetAccountAddress,
    stakingAssetId: confirmedQuote.stakingAssetId,
    select: selectStakingBalance,
  })

  const {
    data: newContractBalanceOfCryptoBaseUnit,
    isSuccess: isNewContractBalanceOfCryptoBaseUnitSuccess,
  } = useStakingBalanceOfQuery<string>({
    stakingAssetId: confirmedQuote.stakingAssetId,
    stakingAssetAccountAddress: getRfoxProxyContract(confirmedQuote.stakingAssetId),
    select: data =>
      bnOrZero(data.toString()).plus(confirmedQuote.stakingAmountCryptoBaseUnit).toFixed(),
  })

  const newShareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(confirmedQuote.stakingAmountCryptoBaseUnit)
        .plus(userStakingBalanceOfCryptoBaseUnit ?? 0)
        .div(newContractBalanceOfCryptoBaseUnit ?? 0)
        .toFixed(4),
    [
      confirmedQuote.stakingAmountCryptoBaseUnit,
      newContractBalanceOfCryptoBaseUnit,
      userStakingBalanceOfCryptoBaseUnit,
    ],
  )

  const isApprovalTxPending = useMemo(
    () => isApprovalMutationPending || (isApprovalMutationSuccess && isApprovalRequired),
    [isApprovalMutationPending, isApprovalMutationSuccess, isApprovalRequired],
  )

  const isApprovalTxSuccess = useMemo(
    () => approvalTx?.status === TxStatus.Confirmed,
    [approvalTx?.status],
  )

  const hasEnoughStakingAssetFeeBalance = useMemo(() => {
    // Staking asset fee asset still loading, assume enough balance not to have a flash of error state on first render
    if (!stakingAssetFeeAsset) return true
    if (bnOrZero(stakingAmountCryptoPrecision).isZero()) return true
    if (bnOrZero(stakingAssetFeeAssetBalanceCryptoPrecision).isZero()) return false

    // Unfortunately, we can't get Tx fees if an approval is required, because getting Tx fees means simulating the Tx, and the Tx would revert on approval needed.
    // So bnOrZero(stakeFees?.totalNetworkFeeCryptoBaseUnit) would always evaluate to 0 in the expression above, if an approval is required.
    const fees = approvalFees || stakeFees

    const hasEnoughFeeBalance = bnOrZero(fees?.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(stakingAssetFeeAssetBalanceCryptoPrecision, stakingAssetFeeAsset.precision),
    )

    if (!hasEnoughFeeBalance) return false

    return true
  }, [
    stakingAssetFeeAsset,
    stakingAmountCryptoPrecision,
    stakingAssetFeeAssetBalanceCryptoPrecision,
    approvalFees,
    stakeFees,
  ])

  // The approval Tx may be confirmed, but that's not enough to know we're ready to stake
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
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          stakingAsset?.assetId,
          getRfoxProxyContract(confirmedQuote.stakingAssetId),
          stakingAssetAccountAddress,
        ),
      )
    })()
  }, [
    approvalTx,
    stakingAsset?.assetId,
    isApprovalTxPending,
    stakingAssetAccountAddress,
    queryClient,
    confirmedQuote.stakingAssetId,
  ])

  const serializedStakeTxIndex = useMemo(() => {
    if (!(stakeTxid && stakingAssetAccountAddress && confirmedQuote.stakingAssetAccountId))
      return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      stakeTxid,
      stakingAssetAccountAddress,
    )
  }, [confirmedQuote.stakingAssetAccountId, stakeTxid, stakingAssetAccountAddress])

  const stakeTx = useAppSelector(gs => selectTxById(gs, serializedStakeTxIndex))
  const isStakeTxPending = useMemo(
    () => isStakeMutationPending || (isStakeMutationSuccess && !stakeTx),
    [isStakeMutationPending, isStakeMutationSuccess, stakeTx],
  )

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const handleSubmit = useCallback(async () => {
    if (!stakingAsset) return
    if (isApprovalRequired) return handleApprove()

    await handleStake()
    history.push(StakeRoutePaths.Status)
  }, [handleStake, history, isApprovalRequired, handleApprove, stakingAsset])

  const stakeCards = useMemo(() => {
    if (!stakingAsset) return null
    return (
      <Card
        display='flex'
        alignItems='center'
        justifyContent='center'
        flexDir='column'
        gap={4}
        py={6}
        px={4}
        flex={1}
        mx={-2}
      >
        <AssetIcon size='sm' assetId={stakingAsset?.assetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value={stakingAmountCryptoPrecision} symbol={stakingAsset?.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value={stakeAmountUserCurrency} />
        </Stack>
      </Card>
    )
  }, [stakeAmountUserCurrency, stakingAmountCryptoPrecision, stakingAsset])

  const confirmCopy = useMemo(() => {
    if (!hasEnoughStakingAssetFeeBalance)
      return translate('common.insufficientAmountForGas', {
        assetSymbol: stakingAssetFeeAsset?.symbol,
        chainSymbol: getChainShortName(stakingAssetFeeAsset?.chainId as KnownChainIds),
      })
    if (isApprovalRequired) return translate('common.approve')
    return translate('RFOX.confirmAndStake')
  }, [
    hasEnoughStakingAssetFeeBalance,
    isApprovalRequired,
    stakingAssetFeeAsset?.chainId,
    stakingAssetFeeAsset?.symbol,
    translate,
  ])

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1} />
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>
          {stakeCards}
          <Timeline>
            {isApprovalRequired ? (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('common.approvalFee')}</Row.Label>
                  <Row.Value>
                    <Skeleton isLoaded={!isGetApprovalFeesLoading}>
                      <Amount.Fiat value={approvalFees?.txFeeFiat ?? 0} />
                    </Skeleton>
                  </Row.Value>
                </CustomRow>
              </TimelineItem>
            ) : (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                  <Skeleton isLoaded={!isStakeFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={stakeFees?.txFeeFiat ?? '0.0'} />
                    </Row.Value>
                  </Skeleton>
                </CustomRow>
              </TimelineItem>
            )}
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
                <Skeleton
                  isLoaded={
                    isNewContractBalanceOfCryptoBaseUnitSuccess &&
                    isUserStakingBalanceOfCryptoBaseUnitSuccess
                  }
                >
                  <Row.Value>
                    <Amount.Percent value={newShareOfPoolPercentage} />
                  </Row.Value>
                </Skeleton>
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
        py={4}
        bg='background.surface.raised.accent'
      >
        <CustomRow>
          <Row.Label>{translate('RFOX.thorchainRewardAddress')}</Row.Label>
          <Row.Value>{middleEllipsis(confirmedQuote.runeAddress)}</Row.Value>
        </CustomRow>
      </CardFooter>
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
          isDisabled={Boolean(
            !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
              isStakeTxPending ||
              !hasEnoughStakingAssetFeeBalance ||
              isAllowanceDataLoading,
          )}
          isLoading={
            isAllowanceDataLoading ||
            isApprovalTxPending ||
            isTransitioning ||
            isStakeFeesLoading ||
            isStakeTxPending
          }
          colorScheme={hasEnoughStakingAssetFeeBalance ? 'blue' : 'red'}
          onClick={handleSubmit}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
