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
import { useMutation, useQuery } from '@tanstack/react-query'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { encodeFunctionData, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
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

import type { RfoxUnstakingQuote } from './types'
import { UnstakeRoutePaths, type UnstakeRouteProps } from './types'

type UnstakeConfirmProps = {
  confirmedQuote: RfoxUnstakingQuote
  unstakeTxid: string | undefined
  setUnstakeTxid: (txId: string) => void
}

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />
const backIcon = <ArrowBackIcon />

export const UnstakeConfirm: React.FC<UnstakeRouteProps & UnstakeConfirmProps> = ({
  confirmedQuote,
  unstakeTxid,
  setUnstakeTxid,
}) => {
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.stakingAssetId).chainId),
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
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

  const unstakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const handleGoBack = useCallback(() => {
    history.push(UnstakeRoutePaths.Input)
  }, [history])

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
          <Amount.Crypto value={unstakingAmountCryptoPrecision} symbol={stakingAsset?.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value='0.0' />
        </Stack>
      </Card>
    )
  }, [stakingAsset, unstakingAmountCryptoPrecision])

  const callData = useMemo(() => {
    if (!stakingAsset) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'unstake',
      args: [BigInt(toBaseUnit(unstakingAmountCryptoPrecision, stakingAsset.precision))],
    })
  }, [stakingAsset, unstakingAmountCryptoPrecision])

  const isGetUnstakeFeesEnabled = useMemo(
    () =>
      Boolean(
        stakingAssetAccountNumber !== undefined &&
          wallet &&
          stakingAsset &&
          callData &&
          feeAsset &&
          feeAssetMarketData,
      ),
    [stakingAssetAccountNumber, wallet, stakingAsset, callData, feeAsset, feeAssetMarketData],
  )

  const {
    data: unstakeFees,
    isLoading: isUnstakeFeesLoading,
    isSuccess: isUnstakeFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: callData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetUnstakeFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const serializedUnstakeTxIndex = useMemo(() => {
    if (!(unstakeTxid && stakingAssetAccountAddress && confirmedQuote.stakingAssetAccountId))
      return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      unstakeTxid,
      stakingAssetAccountAddress,
    )
  }, [confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress, unstakeTxid])

  const {
    mutateAsync: sendUnstakeTx,
    isPending: isUnstakeMutationPending,
    isSuccess: isUnstakeMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined || !stakingAsset || !callData) return

      const adapter = assertGetEvmChainAdapter(stakingAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        adapter,
        data: callData,
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

      setUnstakeTxid(txId)
    },
  })

  const handleSubmit = useCallback(async () => {
    await sendUnstakeTx(undefined)

    history.push(UnstakeRoutePaths.Status)
  }, [history, sendUnstakeTx])

  const unstakeTx = useAppSelector(gs => selectTxById(gs, serializedUnstakeTxIndex))
  const isUnstakeTxPending = useMemo(
    () => isUnstakeMutationPending || (isUnstakeMutationSuccess && !unstakeTx),
    [isUnstakeMutationPending, isUnstakeMutationSuccess, unstakeTx],
  )

  // TODO(gomes): fix me both here and in staking, this should be the staking balance, not the hollistic balanceOf
  const { data: userBalanceOf, isSuccess: isUserBalanceOfSuccess } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
    chainId: arbitrum.id,
    query: {
      select: data => fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0),
      enabled: Boolean(stakingAsset),
    },
  })

  const { data: newContractBalanceOf, isSuccess: isNewContractBalanceOfSuccess } = useReadContract({
    abi: erc20ABI,
    // TODO(gomes): fixme, programmatic in the two places this is uses for unstaking, and in the two for staking
    address: getAddress(fromAssetId(foxOnArbitrumOneAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data =>
        bnOrZero(fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0)).minus(
          unstakingAmountCryptoPrecision,
        ),
    },
  })

  const newShareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userBalanceOf)
        .minus(unstakingAmountCryptoPrecision ?? 0)
        .div(newContractBalanceOf ?? 0)
        .toFixed(4),
    [newContractBalanceOf, unstakingAmountCryptoPrecision, userBalanceOf],
  )

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
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shapeShiftFee')}</Row.Label>
                <Row.Value>{translate('common.free')}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!isUnstakeFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={unstakeFees?.txFeeFiat ?? '0.0'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={isNewContractBalanceOfSuccess && isUserBalanceOfSuccess}>
                    <Amount.Percent value={newShareOfPoolPercentage} />
                  </Skeleton>
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
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button
          size='lg'
          mx={-2}
          colorScheme='blue'
          isLoading={isUnstakeFeesLoading || isUnstakeTxPending}
          disabled={Boolean(!isUnstakeFeesSuccess || isUnstakeTxPending)}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndUnstake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
