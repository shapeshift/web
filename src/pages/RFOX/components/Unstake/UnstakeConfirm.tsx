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
import { fromAccountId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useQueryClient } from '@tanstack/react-query'
import maxBy from 'lodash/maxBy'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { Hash } from 'viem'
import { waitForTransactionReceipt } from 'viem/actions'

import { useRfoxUnstake } from './hooks/useRfoxUnstake'
import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import type { RowProps } from '@/components/Row/Row'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { Timeline, TimelineItem } from '@/components/Timeline/Timeline'
import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { sleep } from '@/lib/poll/poll'
import { getRfoxClient } from '@/pages/RFOX/helpers'
import { useCooldownPeriodQuery } from '@/pages/RFOX/hooks/useCooldownPeriodQuery'
import {
  getUnstakingRequestsQueryFn,
  getUnstakingRequestsQueryKey,
} from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'
import { selectPauseState, useRfoxPauseStateQuery } from '@/pages/RFOX/hooks/useRfoxPauseStateQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UnstakeConfirmProps = {
  confirmedQuote: RfoxUnstakingQuote
  unstakeTxid: string | undefined
  setUnstakeTxid: (txId: string) => void
}

const UNSTAKING_REQUEST_READ_ATTEMPTS = 5
const UNSTAKING_REQUEST_READ_INTERVAL_MS = 2000

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />
const backIcon = <ArrowBackIcon />

export const UnstakeConfirm: React.FC<UnstakeRouteProps & UnstakeConfirmProps> = ({
  confirmedQuote,
  unstakeTxid,
  setUnstakeTxid,
  onClose,
  onClaim,
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const queryClient = useQueryClient()

  const [isAwaitingUnstakeReceipt, setIsAwaitingUnstakeReceipt] = useState(false)

  const { data: cooldownPeriodData } = useCooldownPeriodQuery(confirmedQuote.stakingAssetId)
  const { data: pauseStateData } = useRfoxPauseStateQuery(confirmedQuote.stakingAssetId)

  // The receipt can land after the modal is closed, when nothing should open or close
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )

  const unstakingAmountCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: confirmedQuote.unstakingAmountCryptoBaseUnit,
        precision: stakingAsset?.precision ?? 0,
      }).toPrecision(),
    [confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakingAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.stakingAssetId),
  )

  const unstakingAmountUserCurrency = useMemo(
    () =>
      bnOrZero(unstakingAmountCryptoPrecision)
        .times(bnOrZero(stakingAssetMarketDataUserCurrency?.price))
        .toFixed(),
    [stakingAssetMarketDataUserCurrency?.price, unstakingAmountCryptoPrecision],
  )

  const {
    unstakeFeesQuery: {
      data: unstakeFees,
      isLoading: isUnstakeFeesLoading,
      isSuccess: isUnstakeFeesSuccess,
    },
    isUnstakeTxPending,
    unstakeMutation: { mutateAsync: handleUnstake },
    newContractBalanceOfQuery: { isSuccess: isNewContractBalanceOfCryptoBaseUnitSuccess },
    userStakingBalanceOfQuery: { isSuccess: isUserStakingBalanceOfCryptoBaseUnitSuccess },
    newShareOfPoolPercentage,
  } = useRfoxUnstake({
    stakingAssetId: confirmedQuote.stakingAssetId,
    stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
    amountCryptoBaseUnit: confirmedQuote.unstakingAmountCryptoBaseUnit,
    methods: undefined,
    unstakeTxid,
    setUnstakeTxid,
  })

  const handleGoBack = useCallback(() => {
    navigate(UnstakeRoutePaths.Input)
  }, [navigate])

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
          <Amount.Fiat fontSize='sm' color='text.subtle' value={unstakingAmountUserCurrency} />
        </Stack>
      </Card>
    )
  }, [stakingAsset, unstakingAmountCryptoPrecision, unstakingAmountUserCurrency])

  // With no cooldown the new request is claimable once mined, so hand straight over to claiming
  const claimUnstakingRequest = useCallback(
    async (txId: string) => {
      const { stakingAssetAccountId, stakingAssetId, unstakingAmountCryptoBaseUnit } =
        confirmedQuote
      const { account, chainId } = fromAccountId(stakingAssetAccountId)

      const close = () => {
        if (isMountedRef.current) onClose?.()
      }

      // The read can trail the receipt on another node, so retry until the request shows up
      const findUnstakingRequest = async () => {
        for (let attempt = 0; attempt < UNSTAKING_REQUEST_READ_ATTEMPTS; attempt++) {
          if (attempt) await sleep(UNSTAKING_REQUEST_READ_INTERVAL_MS)

          const { unstakingRequests } = await queryClient.fetchQuery({
            queryKey: getUnstakingRequestsQueryKey({ stakingAssetAccountId, stakingAssetId }),
            queryFn: getUnstakingRequestsQueryFn({ stakingAssetAccountId, stakingAssetId }),
          })

          const unstakingRequest = maxBy(
            unstakingRequests.filter(
              request => request.amountCryptoBaseUnit === unstakingAmountCryptoBaseUnit,
            ),
            'index',
          )
          if (unstakingRequest) return unstakingRequest
        }
      }

      try {
        setIsAwaitingUnstakeReceipt(true)

        // A smart contract wallet hands back its own tx hash rather than an on-chain one
        if (await fetchIsSmartContractAddressQuery(account, chainId)) return close()

        const receipt = await waitForTransactionReceipt(getRfoxClient(stakingAssetId), {
          hash: txId as Hash,
        })
        if (receipt.status !== 'success') return close()

        const unstakingRequest = await findUnstakingRequest()
        if (!unstakingRequest) return close()
        if (!isMountedRef.current) return

        onClaim?.(unstakingRequest)
      } catch {
        close()
      } finally {
        if (isMountedRef.current) setIsAwaitingUnstakeReceipt(false)
      }
    },
    [confirmedQuote, onClaim, onClose, queryClient],
  )

  const handleSubmit = useCallback(async () => {
    if (!stakingAsset) return

    const txId = await handleUnstake()

    if (
      txId &&
      onClaim &&
      cooldownPeriodData?.cooldownPeriodSeconds === 0 &&
      !selectPauseState(pauseStateData).isWithdrawalsPaused
    ) {
      return claimUnstakingRequest(txId)
    }

    onClose?.()
  }, [
    claimUnstakingRequest,
    cooldownPeriodData?.cooldownPeriodSeconds,
    handleUnstake,
    onClaim,
    onClose,
    pauseStateData,
    stakingAsset,
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
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shapeShiftFee')}</Row.Label>
                <Row.Value>{translate('common.free')}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('trade.networkFee')}</Row.Label>
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
                  <Skeleton
                    isLoaded={
                      isNewContractBalanceOfCryptoBaseUnitSuccess &&
                      isUserStakingBalanceOfCryptoBaseUnitSuccess
                    }
                  >
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
          isLoading={isUnstakeFeesLoading || isUnstakeTxPending || isAwaitingUnstakeReceipt}
          disabled={Boolean(
            !isUnstakeFeesSuccess || isUnstakeTxPending || isAwaitingUnstakeReceipt,
          )}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndUnstake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
