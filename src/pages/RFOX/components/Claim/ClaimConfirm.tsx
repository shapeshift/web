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
import { useMutation } from '@tanstack/react-query'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
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
import { firstFourLastFour } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { getStakingContract } from 'pages/RFOX/helpers'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { ClaimRouteProps, RfoxClaimQuote } from './types'
import { ClaimRoutePaths } from './types'

type ClaimConfirmProps = {
  claimQuote: RfoxClaimQuote
  setClaimTxid: (txId: string) => void
  claimTxid: string | undefined
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const ClaimConfirm: FC<Pick<ClaimRouteProps, 'headerComponent'> & ClaimConfirmProps> = ({
  claimQuote,
  claimTxid,
  setClaimTxid,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const stakingAsset = useAppSelector(state => selectAssetById(state, claimQuote.stakingAssetId))

  const claimAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAsset?.assetId ?? ''),
  )

  const stakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(claimQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [claimQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(claimQuote.stakingAssetAccountId).account,
    [claimQuote.stakingAssetAccountId],
  )

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: claimQuote.stakingAssetId,
      accountId: claimQuote.stakingAssetAccountId,
    }
  }, [claimQuote.stakingAssetAccountId, claimQuote.stakingAssetId])

  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const claimAmountUserCurrency = useMemo(
    () =>
      bnOrZero(stakingAmountCryptoPrecision)
        .times(claimAssetMarketDataUserCurrency.price)
        .toFixed(),
    [claimAssetMarketDataUserCurrency.price, stakingAmountCryptoPrecision],
  )

  const callData = useMemo(() => {
    if (!stakingAsset) return

    return encodeFunctionData({
      abi: RFOX_ABI,
      functionName: 'withdraw',
      args: [BigInt(claimQuote.index)],
    })
  }, [stakingAsset, claimQuote.index])

  const {
    mutateAsync: handleClaim,
    isIdle: isClaimMutationIdle,
    isPending: isClaimMutationPending,
    isSuccess: isClaimMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined || !stakingAsset || !callData) return

      const adapter = assertGetEvmChainAdapter(stakingAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        from: stakingAssetAccountAddress,
        adapter,
        data: callData,
        value: '0',
        to: getStakingContract(stakingAsset.assetId),
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

      setClaimTxid(txId)
    },
  })

  const isGetClaimFeesEnabled = useMemo(() => Boolean(isClaimMutationIdle), [isClaimMutationIdle])

  const claimFeesQueryInput = useMemo(
    () => ({
      to: getStakingContract(claimQuote.stakingAssetId),
      from: stakingAssetAccountAddress,
      chainId: fromAssetId(claimQuote.stakingAssetId).chainId,
      accountNumber: stakingAssetAccountNumber,
      data: callData,
      value: '0',
    }),
    [callData, claimQuote.stakingAssetId, stakingAssetAccountAddress, stakingAssetAccountNumber],
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
    if (!(claimTxid && stakingAssetAccountAddress && claimQuote.stakingAssetAccountId)) return ''
    return serializeTxIndex(claimQuote.stakingAssetAccountId, claimTxid, stakingAssetAccountAddress)
  }, [claimQuote.stakingAssetAccountId, claimTxid, stakingAssetAccountAddress])

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
    if (!stakingAsset) return

    await handleClaim()
    history.push(ClaimRoutePaths.Status)
  }, [handleClaim, history, stakingAsset])

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
                <Row.Value>{firstFourLastFour(stakingAssetAccountAddress)}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
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
