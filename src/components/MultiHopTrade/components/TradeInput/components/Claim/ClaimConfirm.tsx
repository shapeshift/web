import { ArrowBackIcon } from '@chakra-ui/icons'
import type { CardFooterProps } from '@chakra-ui/react'
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
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { getChainShortName } from '@shapeshiftoss/utils'
import type { ResolvedValues } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimTx } from './hooks/useArbitrumClaimTx'
import { ClaimRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { firstFourLastFour } from '@/lib/utils'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  activeClaim: ClaimDetails
  setClaimTxHash: (txHash: string) => void
  setClaimTxStatus: (txStatus: TxStatus) => void
}

const backIcon = <ArrowBackIcon />
const cardFooterBgProp = { base: 'transparent', md: 'darkNeutral.800' }
const assetPy = { base: 8, md: 32 }
const slideTransitionStyle: ResolvedValues = { flex: 1, display: 'flex', flexDirection: 'column' }
const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const ClaimConfirm: React.FC<ClaimConfirmProps> = ({
  activeClaim,
  setClaimTxHash,
  setClaimTxStatus,
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    navigate(ClaimRoutePaths.Select)
  }, [navigate])

  const asset = useAppSelector(state => selectAssetById(state, activeClaim.assetId))

  const assetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, activeClaim.assetId),
  )

  const destinationAsset = useAppSelector(state =>
    selectAssetById(state, activeClaim.destinationAssetId),
  )

  const destinationAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, activeClaim.destinationAssetId),
  )

  const destinationAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, activeClaim.destinationChainId),
  )

  const destinationFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, activeClaim.destinationChainId),
  )

  const destinationFeeAssetBalanceFilter = useMemo(
    () => ({
      accountId: destinationAccountId,
      assetId: destinationFeeAsset?.assetId,
    }),
    [destinationAccountId, destinationFeeAsset],
  )

  const destinationFeeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, destinationFeeAssetBalanceFilter),
  )

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(activeClaim.amountCryptoBaseUnit, asset?.precision ?? 0),
    [activeClaim.amountCryptoBaseUnit, asset],
  )

  const amountUserCurrency = useMemo(() => {
    const price = destinationAssetMarketDataUserCurrency?.price
      ? destinationAssetMarketDataUserCurrency.price
      : assetMarketDataUserCurrency?.price

    return bnOrZero(amountCryptoPrecision).times(bnOrZero(price)).toFixed()
  }, [
    assetMarketDataUserCurrency?.price,
    destinationAssetMarketDataUserCurrency?.price,
    amountCryptoPrecision,
  ])

  const { evmFeesResult, claimMutation } = useArbitrumClaimTx(
    activeClaim,
    destinationAccountId,
    setClaimTxHash,
    setClaimTxStatus,
  )

  const hasEnoughDestinationFeeBalance = useMemo(() => {
    if (!destinationFeeAsset) return true
    if (!evmFeesResult.data?.networkFeeCryptoBaseUnit) return true

    return bnOrZero(evmFeesResult.data.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(destinationFeeAssetBalanceCryptoPrecision, destinationFeeAsset.precision),
    )
  }, [destinationFeeAsset, destinationFeeAssetBalanceCryptoPrecision, evmFeesResult.data])

  const handleSubmit = useCallback(async () => {
    await claimMutation.mutateAsync()
    navigate(ClaimRoutePaths.Status)
  }, [claimMutation, navigate])

  const confirmCopy = useMemo(() => {
    if (claimMutation.isError) {
      return translate('trade.errors.title')
    }

    if (evmFeesResult.isError) {
      console.error(evmFeesResult.error)
      return translate('trade.errors.networkFeeEstimateFailed')
    }

    if (!hasEnoughDestinationFeeBalance) {
      return translate('common.insufficientAmountForGas', {
        assetSymbol: destinationFeeAsset?.symbol,
        chainSymbol: getChainShortName(destinationFeeAsset?.chainId as KnownChainIds),
      })
    }

    return translate('bridge.confirmAndClaim')
  }, [claimMutation, destinationFeeAsset, evmFeesResult, hasEnoughDestinationFeeBalance, translate])

  if (!asset) return null

  return (
    <Flex flexDir='column' flex={1}>
      <SlideTransition style={slideTransitionStyle}>
        <CardHeader display='flex' alignItems='center' gap={2}>
          <Flex flex={1}>
            <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
          </Flex>
          <Flex textAlign='center'>{translate('common.confirm')}</Flex>
          <Flex flex={1} />
        </CardHeader>
        <CardBody>
          <Card
            display='flex'
            alignItems='center'
            justifyContent='center'
            flexDir='column'
            flex={1}
            py={assetPy}
          >
            <AssetIcon size='lg' assetId={destinationAsset?.assetId ?? asset.assetId} />
            <Stack textAlign='center' mt={4} spacing={0}>
              <Amount.Crypto
                fontWeight='bold'
                fontSize='md'
                value={amountCryptoPrecision}
                symbol={destinationAsset?.symbol ?? asset.symbol}
              />
              <Amount.Fiat fontSize='md' color='text.subtle' value={amountUserCurrency} />
            </Stack>
          </Card>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          mt={2}
          gap={4}
          px={6}
          bg={cardFooterBgProp}
          borderBottomRadius='xl'
          position={footerPosition}
          bottom='var(--mobile-nav-offset)'
        >
          <Stack spacing={4}>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('bridge.claimReceiveAddress')}</Row.Label>
              <Row.Value>{firstFourLastFour(activeClaim.destinationAddress)}</Row.Value>
            </Row>
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!evmFeesResult.isLoading && !evmFeesResult.isPending}>
                  <Row.Value>
                    <Amount.Fiat value={evmFeesResult?.data?.txFeeFiat || '0.00'} />
                  </Row.Value>
                </Skeleton>
              </Row.Value>
            </Row>
            <Button
              size='lg'
              mx={-2}
              colorScheme={
                !hasEnoughDestinationFeeBalance || claimMutation.isError || evmFeesResult.isError
                  ? 'red'
                  : 'blue'
              }
              isDisabled={
                !evmFeesResult.isSuccess ||
                evmFeesResult.isPending ||
                claimMutation.isPending ||
                !hasEnoughDestinationFeeBalance
              }
              isLoading={
                evmFeesResult.isLoading || evmFeesResult.isPending || claimMutation.isPending
              }
              onClick={handleSubmit}
            >
              {confirmCopy}
            </Button>
          </Stack>
        </CardFooter>
      </SlideTransition>
    </Flex>
  )
}
