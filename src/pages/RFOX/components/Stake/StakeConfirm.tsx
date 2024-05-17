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
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
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
import { arbitrum } from 'viem/chains'
import { encodeFunctionData, getAddress } from 'viem/utils'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
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
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [approvalTxId, setApprovalTxId] = useState<string | undefined>()

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.stakingAssetId).chainId),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const stakingAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.stakingAssetId),
  )

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

  const { data: userBalanceOf, isSuccess: isUserBalanceOfSuccess } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
    chainId: arbitrum.id,
    query: {
      select: data => data.toString(),
    },
  })

  const { data: contractBalanceOf, isSuccess: isContractBalanceOfSuccess } = useReadContract({
    abi: erc20ABI,
    address: getAddress(fromAssetId(foxOnArbitrumOneAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data => data.toString(),
    },
  })

  const shareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userBalanceOf)
        .div(contractBalanceOf ?? 0)
        .toFixed(4),
    [contractBalanceOf, userBalanceOf],
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

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        isApprovalRequired &&
          stakingAssetAccountNumber !== undefined &&
          feeAsset &&
          feeAssetMarketData &&
          wallet,
      ),
    [feeAsset, feeAssetMarketData, isApprovalRequired, stakingAssetAccountNumber, wallet],
  )

  const {
    data: approvalFees,
    isLoading: isGetApprovalFeesLoading,
    isSuccess: isGetApprovalFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      value: '0',
      accountNumber: stakingAssetAccountNumber!, // see isGetApprovalFeesEnabled
      feeAsset: feeAsset!, // see isGetApprovalFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetApprovalFeesEnabled
      to: fromAssetId(foxOnArbitrumOneAssetId).assetReference,
      data: approvalCallData,
      wallet: wallet!, // see isGetApprovalFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetApprovalFeesEnabled,
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

  const isGetStakeFeesEnabled = useMemo(
    () =>
      Boolean(
        stakingAssetAccountNumber !== undefined &&
          wallet &&
          stakingAsset &&
          !isApprovalRequired &&
          feeAsset &&
          feeAssetMarketData,
      ),
    [
      stakingAssetAccountNumber,
      wallet,
      stakingAsset,
      isApprovalRequired,
      feeAsset,
      feeAssetMarketData,
    ],
  )

  const {
    data: stakeFees,
    isLoading: isStakeFeesLoading,
    isSuccess: isStakeFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: stakeCallData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetStakeFeesEnabled,
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
                <Skeleton isLoaded={isUserBalanceOfSuccess && isContractBalanceOfSuccess}>
                  <Row.Value>
                    <Amount.Percent value={shareOfPoolPercentage} />
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
          disabled={Boolean(
            !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
              isStakeTxPending ||
              isAllowanceDataLoading,
          )}
          isLoading={
            isAllowanceDataLoading || isApprovalTxPending || isStakeFeesLoading || isStakeTxPending
          }
          colorScheme='blue'
          onClick={handleSubmit}
        >
          {translate(isApprovalRequired ? 'common.approve' : 'RFOX.confirmAndStake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
