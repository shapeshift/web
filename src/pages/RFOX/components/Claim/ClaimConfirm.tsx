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
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import { useMutation } from '@tanstack/react-query'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { encodeFunctionData } from 'viem'

import type { UnstakingRequest } from '../../hooks/useGetUnstakingRequestsQuery/utils'
import { useRFOXContext } from '../../hooks/useRfoxContext'
import { RfoxRoute } from '../../types'
import type { ClaimRouteProps } from './types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import type { RowProps } from '@/components/Row/Row'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { Timeline, TimelineItem } from '@/components/Timeline/Timeline'
import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { middleEllipsis } from '@/lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { getStakingContract } from '@/pages/RFOX/helpers'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
  selectWalletActions,
} from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  selectedUnstakingRequest: UnstakingRequest
  setClaimTxid: (txId: string) => void
  claimTxid: string | undefined
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const ClaimConfirm: FC<Pick<ClaimRouteProps, 'headerComponent'> & ClaimConfirmProps> = ({
  selectedUnstakingRequest,
  claimTxid,
  setClaimTxid,
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  const isRFOXFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')

  const actions = useAppSelector(selectWalletActions)

  const { stakingAssetAccountId, setStakingAssetAccountId } = useRFOXContext()

  useEffect(() => {
    // Do this as early as possible to ensure the app is properly in sync. Users may have selected a claim from the notification center that's from a
    // different AccountId than their current one
    if (selectedUnstakingRequest.stakingAssetAccountId !== stakingAssetAccountId) {
      setStakingAssetAccountId(selectedUnstakingRequest.stakingAssetAccountId)
    }
  }, [
    selectedUnstakingRequest.stakingAssetAccountId,
    stakingAssetAccountId,
    setStakingAssetAccountId,
  ])

  const maybeClaimAction = useMemo(
    () => actions.find(action => action.id === selectedUnstakingRequest.id),
    [actions, selectedUnstakingRequest.id],
  )

  const handleGoBack = useCallback(() => {
    if (isRFOXFoxEcosystemPageEnabled) {
      return navigate('/fox-ecosystem')
    }

    navigate(RfoxRoute.Claim)
  }, [navigate, isRFOXFoxEcosystemPageEnabled])

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, selectedUnstakingRequest.stakingAssetId),
  )

  const claimAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, selectedUnstakingRequest.stakingAssetId),
  )

  const stakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(selectedUnstakingRequest.amountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [selectedUnstakingRequest.amountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(selectedUnstakingRequest.stakingAssetAccountId).account,
    [selectedUnstakingRequest.stakingAssetAccountId],
  )

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: selectedUnstakingRequest.stakingAssetId,
      accountId: selectedUnstakingRequest.stakingAssetAccountId,
    }
  }, [selectedUnstakingRequest.stakingAssetId, selectedUnstakingRequest.stakingAssetAccountId])

  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const claimAmountUserCurrency = useMemo(
    () =>
      bnOrZero(stakingAmountCryptoPrecision)
        .times(bnOrZero(claimAssetMarketDataUserCurrency?.price))
        .toFixed(),
    [claimAssetMarketDataUserCurrency?.price, stakingAmountCryptoPrecision],
  )

  const callData = useMemo(() => {
    return encodeFunctionData({
      abi: RFOX_ABI,
      functionName: 'withdraw',
      args: [BigInt(selectedUnstakingRequest.index)],
    })
  }, [selectedUnstakingRequest.index])

  const {
    mutateAsync: handleClaim,
    isIdle: isClaimMutationIdle,
    isPending: isClaimMutationPending,
    isSuccess: isClaimMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined) return

      const adapter = assertGetEvmChainAdapter(
        fromAssetId(selectedUnstakingRequest.stakingAssetId).chainId,
      )

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        from: stakingAssetAccountAddress,
        adapter,
        data: callData,
        value: '0',
        to: getStakingContract(selectedUnstakingRequest.stakingAssetId),
        wallet,
        pubKey:
          isTrezor(wallet) && selectedUnstakingRequest.stakingAssetAccountId
            ? fromAccountId(selectedUnstakingRequest.stakingAssetAccountId).account
            : undefined,
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

      setClaimTxid(txId)

      // Update the RFOX claim action with the transaction hash
      dispatch(
        actionSlice.actions.upsertAction({
          id: selectedUnstakingRequest.id,
          status: ActionStatus.Pending,
          type: ActionType.RfoxClaim,
          createdAt: maybeClaimAction?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          rfoxClaimActionMetadata: {
            request: selectedUnstakingRequest,
            txHash: txId,
          },
        }),
      )
    },
  })

  const isGetClaimFeesEnabled = useMemo(() => Boolean(isClaimMutationIdle), [isClaimMutationIdle])

  const claimFeesQueryInput = useMemo(
    () => ({
      to: getStakingContract(selectedUnstakingRequest.stakingAssetId),
      from: stakingAssetAccountAddress,
      chainId: fromAssetId(selectedUnstakingRequest.stakingAssetId).chainId,
      accountNumber: stakingAssetAccountNumber,
      data: callData,
      value: '0',
    }),
    [
      callData,
      selectedUnstakingRequest.stakingAssetId,
      stakingAssetAccountAddress,
      stakingAssetAccountNumber,
    ],
  )

  const {
    data: claimFees,
    isLoading: isClaimFeesLoading,
    isSuccess: isClaimFeesSuccess,
  } = useEvmFees({
    ...claimFeesQueryInput,
    enabled: isGetClaimFeesEnabled,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetClaimFeesEnabled ? 15_000 : false,
  })

  const serializedClaimTxIndex = useMemo(() => {
    if (
      !(claimTxid && stakingAssetAccountAddress && selectedUnstakingRequest.stakingAssetAccountId)
    )
      return ''

    return serializeTxIndex(
      selectedUnstakingRequest.stakingAssetAccountId,
      claimTxid,
      stakingAssetAccountAddress,
    )
  }, [selectedUnstakingRequest.stakingAssetAccountId, claimTxid, stakingAssetAccountAddress])

  const claimCard = useMemo(() => {
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
          <Amount.Fiat fontSize='sm' color='text.subtle' value={claimAmountUserCurrency} />
        </Stack>
      </Card>
    )
  }, [stakingAsset, stakingAmountCryptoPrecision, claimAmountUserCurrency])

  const handleSubmit = useCallback(async () => {
    const txHash = await handleClaim()
    if (!txHash) return
    if (isRFOXFoxEcosystemPageEnabled) {
      return navigate(`/fox-ecosystem`)
    }

    navigate(`${RfoxRoute.Claim}/`)
  }, [handleClaim, navigate, isRFOXFoxEcosystemPageEnabled])

  const claimTx = useAppSelector(gs => selectTxById(gs, serializedClaimTxIndex))

  const isClaimTxPending = useMemo(
    () => isClaimMutationPending || (isClaimMutationSuccess && !claimTx),
    [claimTx, isClaimMutationPending, isClaimMutationSuccess],
  )

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
          {claimCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.claimReceiveAddress')}</Row.Label>
                <Row.Value>{middleEllipsis(stakingAssetAccountAddress)}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('trade.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!isClaimFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={claimFees?.txFeeFiat || '0.00'} />
                    </Row.Value>
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
          isLoading={isClaimFeesLoading || isClaimTxPending}
          disabled={!isClaimFeesSuccess || isClaimTxPending}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndClaim')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
