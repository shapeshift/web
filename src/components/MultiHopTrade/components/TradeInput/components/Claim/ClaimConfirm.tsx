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
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { convertPrecision } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { firstFourLastFour } from 'lib/utils'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { useArbitrumClaimTx } from './hooks/useArbitrumClaimTx'
import { ClaimRoutePaths } from './types'

type ClaimConfirmProps = {
  activeClaim: ClaimDetails
  setClaimTxHash: (txHash: string) => void
  setClaimTxStatus: (txStatus: TxStatus) => void
}

const backIcon = <ArrowBackIcon />

export const ClaimConfirm: React.FC<ClaimConfirmProps> = ({
  activeClaim,
  setClaimTxHash,
  setClaimTxStatus,
}) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

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

  const amountCryptoPrecision = useMemo(() => {
    const _amountCryptoPrecision = fromBaseUnit(
      activeClaim.amountCryptoBaseUnit,
      asset?.precision ?? 0,
    )
    if (asset?.precision === destinationAsset?.precision) {
      return _amountCryptoPrecision
    }

    // Precision shouldn't be different between an asset and its bridge flavour but...
    return convertPrecision({
      value: fromBaseUnit(activeClaim.amountCryptoBaseUnit, asset?.precision ?? 0),
      inputExponent: asset?.precision,
      outputExponent: destinationAsset?.precision,
    }).toFixed()
  }, [activeClaim.amountCryptoBaseUnit, asset, destinationAsset])

  const amountUserCurrency = useMemo(() => {
    const price =
      destinationAssetMarketDataUserCurrency.price !== '0'
        ? destinationAssetMarketDataUserCurrency.price
        : assetMarketDataUserCurrency.price

    return bnOrZero(amountCryptoPrecision).times(price).toFixed()
  }, [
    assetMarketDataUserCurrency.price,
    destinationAssetMarketDataUserCurrency.price,
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
    history.push(ClaimRoutePaths.Status)
  }, [claimMutation, history])

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
    <SlideTransition>
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
          py={32}
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
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
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
  )
}
