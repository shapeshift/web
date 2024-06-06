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
import { useMutation, useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row, type RowProps } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { firstFourLastFour } from 'lib/utils'
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

import { ClaimRoutePaths, type ClaimRouteProps, type RfoxClaimQuote } from './types'

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

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(claimQuote.claimAssetId).chainId),
  )

  const feeAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const stakingAsset = useAppSelector(state => selectAssetById(state, claimQuote.claimAssetId))

  const claimAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAsset?.assetId ?? ''),
  )

  const stakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(claimQuote.claimAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [claimQuote.claimAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(claimQuote.claimAssetAccountId).account,
    [claimQuote.claimAssetAccountId],
  )

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: claimQuote.claimAssetId,
      accountId: claimQuote.claimAssetAccountId,
    }
  }, [claimQuote.claimAssetAccountId, claimQuote.claimAssetId])

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
      abi: foxStakingV1Abi,
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

      setClaimTxid(txId)
    },
  })

  const isGetClaimFeesEnabled = useMemo(
    () =>
      Boolean(
        isClaimMutationIdle &&
          stakingAssetAccountNumber !== undefined &&
          wallet &&
          stakingAsset &&
          callData &&
          feeAsset &&
          feeAssetMarketDataUserCurrency,
      ),
    [
      isClaimMutationIdle,
      stakingAssetAccountNumber,
      wallet,
      stakingAsset,
      callData,
      feeAsset,
      feeAssetMarketDataUserCurrency,
    ],
  )

  const {
    data: claimFees,
    isLoading: isClaimFeesLoading,
    isSuccess: isClaimFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: callData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketDataUserCurrency!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetClaimFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetClaimFeesEnabled ? 15_000 : false,
  })

  const serializedClaimTxIndex = useMemo(() => {
    if (!(claimTxid && stakingAssetAccountAddress && claimQuote.claimAssetAccountId)) return ''
    return serializeTxIndex(claimQuote.claimAssetAccountId, claimTxid, stakingAssetAccountAddress)
  }, [claimQuote.claimAssetAccountId, claimTxid, stakingAssetAccountAddress])

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
    await handleClaim()
    history.push(ClaimRoutePaths.Status)
  }, [handleClaim, history])

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
        <Flex flex={1}></Flex>
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
