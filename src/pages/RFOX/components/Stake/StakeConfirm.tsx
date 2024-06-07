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
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import type { GetFeesWithWalletArgs, MaybeGetFeesWithWalletArgs } from 'lib/utils/evm'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  isGetFeesWithWalletArgs,
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
  const toast = useToast()
  const queryClient = useQueryClient()
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
  const adapter = useMemo(
    () => (feeAsset ? assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId) : undefined),
    [feeAsset],
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

  const {
    data: userStakingBalanceOfCryptoBaseUnit,
    isSuccess: isUserStakingBalanceOfCryptoBaseUnitSuccess,
  } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'stakingInfo',
    args: [getAddress(stakingAssetAccountAddress)], // actually defined, see enabled below
    chainId: arbitrum.id,
    query: {
      enabled: Boolean(stakingAssetAccountAddress),
      select: ([stakingBalance]) => stakingBalance.toString(),
    },
  })

  const {
    data: newContractBalanceOfCryptoBaseUnit,
    isSuccess: isNewContractBalanceOfCryptoBaseUnitSuccess,
  } = useReadContract({
    abi: erc20ABI,
    address: getAddress(fromAssetId(confirmedQuote.stakingAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data =>
        bnOrZero(data.toString()).plus(confirmedQuote.stakingAmountCryptoBaseUnit).toFixed(),
    },
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

  const {
    mutateAsync: handleApprove,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
    isIdle: isApprovalMutationIdle,
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
      toast({
        title: translate('modals.send.transactionSent'),
        description: (
          <Text>
            {feeAsset?.explorerTxLink && (
              <Link href={`${feeAsset.explorerTxLink}${txId}`} isExternal>
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

  const isGetApprovalFeesEnabled = useCallback(
    (input: MaybeGetFeesWithWalletArgs): input is GetFeesWithWalletArgs =>
      Boolean(isGetFeesWithWalletArgs(input) && isApprovalMutationIdle && isApprovalRequired),
    [isApprovalMutationIdle, isApprovalRequired],
  )

  const approvalFeesQueryInput = useMemo(
    () => ({
      value: '0',
      accountNumber: stakingAssetAccountNumber!,
      to: fromAssetId(confirmedQuote.stakingAssetId).assetReference,
      chainId: fromAssetId(confirmedQuote.stakingAssetId).chainId,
      from: stakingAssetAccountAddress,
      data: approvalCallData,
    }),
    [
      approvalCallData,
      confirmedQuote.stakingAssetId,
      stakingAssetAccountAddress,
      stakingAssetAccountNumber,
    ],
  )

  const getApprovalFeesWithWalletInput = useMemo(
    () => ({ ...approvalFeesQueryInput, adapter, wallet }),
    [adapter, approvalFeesQueryInput, wallet],
  )

  const {
    data: approvalFees,
    isLoading: isGetApprovalFeesLoading,
    isSuccess: isGetApprovalFeesSuccess,
  } = useEvmFees({
    ...approvalFeesQueryInput,
    enabled: Boolean(isApprovalMutationIdle && isApprovalRequired),
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetApprovalFeesEnabled(getApprovalFeesWithWalletInput) ? 15_000 : false,
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
          RFOX_PROXY_CONTRACT_ADDRESS,
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
  ])

  // Stake bits

  const stakeCallData = useMemo(() => {
    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'stake',
      args: [BigInt(confirmedQuote.stakingAmountCryptoBaseUnit), confirmedQuote.runeAddress],
    })
  }, [confirmedQuote.runeAddress, confirmedQuote.stakingAmountCryptoBaseUnit])

  const {
    mutateAsync: handleStake,
    isPending: isStakeMutationPending,
    isSuccess: isStakeMutationSuccess,
    isIdle: isStakeMutationIdle,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined || !stakingAsset || !adapter) return

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

  const isGetStakeFeesEnabled = useCallback(
    (input: MaybeGetFeesWithWalletArgs): input is GetFeesWithWalletArgs =>
      Boolean(!isApprovalRequired && isStakeMutationIdle && isGetFeesWithWalletArgs(input)),
    [isApprovalRequired, isStakeMutationIdle],
  )

  const stakeFeesQueryInput = useMemo(
    () => ({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber!,
      data: stakeCallData,
      value: '0',
      chainId: fromAssetId(confirmedQuote.stakingAssetId).chainId,
    }),
    [
      confirmedQuote.stakingAssetId,
      stakeCallData,
      stakingAssetAccountAddress,
      stakingAssetAccountNumber,
    ],
  )

  const getStakeFeesWithWalletInput = useMemo(
    () => ({ ...stakeFeesQueryInput, adapter, wallet }),
    [adapter, stakeFeesQueryInput, wallet],
  )

  const {
    data: stakeFees,
    isLoading: isStakeFeesLoading,
    isSuccess: isStakeFeesSuccess,
  } = useEvmFees({
    ...stakeFeesQueryInput,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetStakeFeesEnabled(getStakeFeesWithWalletInput) ? 15_000 : false,
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
  }, [handleStake, history, isApprovalRequired, handleApprove])

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
          disabled={Boolean(
            !(isStakeFeesSuccess || isGetApprovalFeesSuccess) ||
              isStakeTxPending ||
              isAllowanceDataLoading,
          )}
          isLoading={
            isAllowanceDataLoading ||
            isApprovalTxPending ||
            isTransitioning ||
            isStakeFeesLoading ||
            isStakeTxPending
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
