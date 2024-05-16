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
import { arbitrumAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem/utils'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { estimateFees } from 'components/Modals/Send/utils'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import type { EstimatedFeesQueryKey } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxStakingQuote } from './types'
import { StakeRoutePaths, type StakeRouteProps } from './types'

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
  // TODO(gomes): programmatic pls
  const feeAssetId = arbitrumAssetId
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [approvalTxId, setApprovalTxId] = useState<string | undefined>()

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )
  const stakingAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.stakingAssetId),
  )
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: confirmedQuote.stakingAssetId,
      accountId: confirmedQuote.stakingAssetAccountId,
    }
  }, [confirmedQuote.stakingAssetAccountId, confirmedQuote.stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
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

  // Approval/Allowance bits

  const { data: allowanceDataCryptoBaseUnit, isLoading: isAllowanceDataLoading } = useAllowance({
    assetId: stakingAsset?.assetId,
    spender: RFOX_PROXY_CONTRACT_ADDRESS,
    from: fromAccountId(confirmedQuote.stakingAssetAccountId).account,
  })

  const isApprovalRequired = useMemo(
    () => bnOrZero(allowanceDataCryptoBaseUnit).lt(confirmedQuote.stakingAmountCryptoBaseUnit),
    [allowanceDataCryptoBaseUnit, confirmedQuote.stakingAmountCryptoBaseUnit],
  )

  const approvalCallData = useMemo(() => {
    return encodeFunctionData({
      abi: erc20ABI,
      functionName: 'approve',
      args: [RFOX_PROXY_CONTRACT_ADDRESS, BigInt(confirmedQuote.stakingAmountCryptoBaseUnit)],
    })
  }, [confirmedQuote.stakingAmountCryptoBaseUnit])

  const estimateApprovalFeesInput = useMemo(
    () => ({
      // This is a contract call i.e 0 value
      amountCryptoPrecision: '0',
      assetId: confirmedQuote.stakingAssetId,
      feeAssetId: feeAsset?.assetId ?? '',
      // TODO(gomes): const somewhere
      to: fromAccountId(confirmedQuote.stakingAssetAccountId).account,
      sendMax: false,
      memo: approvalCallData,
      accountId: confirmedQuote.stakingAssetAccountId ?? '',
      contractAddress: undefined,
      // TODO(gomes): dev only, revert me
      staleTime: Infinity,
      gcTime: Infinity,
    }),
    [
      confirmedQuote.stakingAssetId,
      confirmedQuote.stakingAssetAccountId,
      feeAsset?.assetId,
      approvalCallData,
    ],
  )

  // TODO(gomes): move this queryFn out of lending
  // and actually make one specific for approval estimations for QoL
  const estimatedApprovalFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled: isApprovalRequired,
        asset: stakingAsset,
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput: estimateApprovalFeesInput,
      },
    ],
    [isApprovalRequired, stakingAsset, feeAsset, feeAssetMarketData, estimateApprovalFeesInput],
  )

  const { data: estimatedApprovalFees, isLoading: isEstimatedApprovalFeesLoading } = useQuery({
    queryKey: estimatedApprovalFeesQueryKey,
    staleTime: 30_000,
    queryFn: async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
      const { estimateFeesInput, feeAsset, feeAssetMarketData } = queryKey[1]

      // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
      if (!feeAsset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

      const estimatedFees = await estimateFees(estimateFeesInput)
      const txFeeFiat = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },

    enabled: isApprovalRequired,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && stakingAssetAccountAddress && confirmedQuote.stakingAssetAccountId))
      return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      approvalTxId,
      stakingAssetAccountAddress,
    )
  }, [approvalTxId, confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress])

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))

  const {
    mutate: sendApprovalTx,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: confirmedQuote.stakingAssetId,
      spender: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      amount: confirmedQuote.stakingAmountCryptoBaseUnit,
      wallet,
      accountNumber: stakingAssetAccountNumber,
    }),
    onSuccess: (txId: string) => {
      setApprovalTxId(txId)
    },
  })

  const handleApprove = useCallback(() => sendApprovalTx(undefined), [sendApprovalTx])

  const isApprovalTxPending = useMemo(
    () =>
      isApprovalMutationPending ||
      (isApprovalMutationSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalMutationPending, isApprovalMutationSuccess],
  )

  useEffect(() => {
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          stakingAsset?.assetId,
          RFOX_PROXY_CONTRACT_ADDRESS,
          stakingAssetAccountAddress,
        ),
      )
    })()
  }, [approvalTx, stakingAsset?.assetId, isApprovalTxPending, stakingAssetAccountAddress])

  // Stake bits

  const stakeCallData = useMemo(() => {
    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'stake',
      args: [BigInt(confirmedQuote.stakingAmountCryptoBaseUnit), confirmedQuote.runeAddress],
    })
  }, [confirmedQuote.runeAddress, confirmedQuote.stakingAmountCryptoBaseUnit])

  const estimateStakeFeesInput = useMemo(
    () => ({
      // This is a contract call i.e 0 value
      amountCryptoPrecision: '0',
      assetId: confirmedQuote.stakingAssetId,
      feeAssetId: feeAsset?.assetId ?? '',
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      sendMax: false,
      memo: stakeCallData,
      accountId: confirmedQuote.stakingAssetAccountId,
      contractAddress: undefined,
      // TODO(gomes): dev only, revert me
      staleTime: Infinity,
      gcTime: Infinity,
    }),
    [
      confirmedQuote.stakingAssetId,
      confirmedQuote.stakingAssetAccountId,
      feeAsset?.assetId,
      stakeCallData,
    ],
  )

  // TODO(gomes): move this queryFn out of lending
  // and actually make one specific for approval estimations for QoL
  const estimatedStakeFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled: !isApprovalRequired,
        asset: stakingAsset,
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput: estimateStakeFeesInput,
      },
    ],
    [isApprovalRequired, stakingAsset, feeAsset, feeAssetMarketData, estimateStakeFeesInput],
  )

  const { data: estimatedStakeFees, isLoading: isEstimatedStakeFeesLoading } = useQuery({
    queryKey: estimatedStakeFeesQueryKey,
    staleTime: 30_000,
    queryFn: async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
      const { estimateFeesInput, feeAsset, feeAssetMarketData } = queryKey[1]

      // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
      if (!feeAsset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

      const estimatedFees = await estimateFees(estimateFeesInput)
      const txFeeFiat = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
        .times(feeAssetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },

    enabled: !isApprovalRequired,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const serializedStakeTxIndex = useMemo(() => {
    if (!(stakeTxid && stakingAssetAccountAddress && confirmedQuote.stakingAssetAccountId))
      return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      stakeTxid,
      stakingAssetAccountAddress,
    )
  }, [confirmedQuote.stakingAssetAccountId, stakeTxid, stakingAssetAccountAddress])

  const {
    mutateAsync: sendStakeTx,
    isPending: isStakeMutationPending,
    isSuccess: isStakeMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined || !stakingAsset) return

      const adapter = assertGetEvmChainAdapter(stakingAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        adapter,
        data: stakeCallData,
        value: '0',
        to: RFOX_PROXY_CONTRACT_ADDRESS,
        wallet,
      })

      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      return txId
    },
    onSuccess: (txId: string | undefined) => {
      if (!txId) return

      setStakeTxid(txId)
    },
  })

  const handleStake = useCallback(() => sendStakeTx(undefined), [sendStakeTx])

  const stakeTx = useAppSelector(gs => selectTxById(gs, serializedStakeTxIndex))
  const isStakeTxPending = useMemo(
    () => isStakeMutationPending || (isStakeMutationSuccess && !stakeTx),
    [isStakeMutationPending, isStakeMutationSuccess, stakeTx],
  )

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const handleSubmit = useCallback(async () => {
    if (isApprovalRequired) return handleApprove()

    await handleStake()

    history.push(StakeRoutePaths.Status)
  }, [handleApprove, handleStake, history, isApprovalRequired])

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
          {stakeCards}
          <Timeline>
            {isApprovalRequired ? (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('RFOX.approvalFee')}</Row.Label>
                  <Row.Value>
                    <Skeleton isLoaded={!isEstimatedApprovalFeesLoading}>
                      <Amount.Fiat value={estimatedApprovalFees?.txFeeFiat ?? 0} />
                    </Skeleton>
                  </Row.Value>
                </CustomRow>
              </TimelineItem>
            ) : (
              <TimelineItem>
                <CustomRow>
                  <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                  <Skeleton isLoaded={!isEstimatedStakeFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={estimatedStakeFees?.txFeeFiat ?? '0.0'} />
                    </Row.Value>
                  </Skeleton>
                </CustomRow>
              </TimelineItem>
            )}
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent value='0.0' />
                </Row.Value>
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
          disabled={Boolean(
            isAllowanceDataLoading || isEstimatedStakeFeesLoading || isStakeTxPending,
          )}
          isLoading={isApprovalTxPending || isEstimatedStakeFeesLoading || isStakeTxPending}
          colorScheme='blue'
          onClick={handleSubmit}
        >
          {translate(isApprovalRequired ? 'common.approve' : 'RFOX.confirmAndStake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
