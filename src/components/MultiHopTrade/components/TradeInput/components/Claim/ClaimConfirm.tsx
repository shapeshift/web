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
import { fromAssetId } from '@shapeshiftoss/caip'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { firstFourLastFour, isToken } from 'lib/utils'
import { selectRelatedAssetIdsByAssetId } from 'state/slices/related-assets-selectors'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
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

  const { evmFeesResult, claimMutation } = useArbitrumClaimTx(
    activeClaim,
    setClaimTxHash,
    setClaimTxStatus,
  )

  const asset = useAppSelector(state => selectAssetById(state, activeClaim.assetId))

  const assetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, activeClaim.assetId),
  )

  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsByAssetId(state, { assetId: asset?.relatedAssetKey ?? '' }),
  )

  const destinationAssetId = useMemo(() => {
    return relatedAssetIds.find(assetId => {
      if (isToken(activeClaim.assetId)) {
        return fromAssetId(assetId).chainId === activeClaim.destinationChainId && isToken(assetId)
      } else {
        return fromAssetId(assetId).chainId === activeClaim.destinationChainId && !isToken(assetId)
      }
    })
  }, [activeClaim, relatedAssetIds])

  const destinationAsset = useAppSelector(state => selectAssetById(state, destinationAssetId ?? ''))

  const destinationAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, destinationAssetId ?? ''),
  )

  const amountCryptoPrecision = useMemo(() => {
    return fromBaseUnit(activeClaim.amountCryptoBaseUnit, destinationAsset?.precision ?? 0)
  }, [activeClaim.amountCryptoBaseUnit, destinationAsset])

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

  const handleSubmit = useCallback(async () => {
    await claimMutation.mutateAsync()
    history.push(ClaimRoutePaths.Status)
  }, [claimMutation, history])

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
            colorScheme='blue'
            isLoading={
              evmFeesResult.isLoading || evmFeesResult.isPending || claimMutation.isPending
            }
            disabled={
              !evmFeesResult.isSuccess || evmFeesResult.isPending || claimMutation.isPending
            }
            onClick={handleSubmit}
          >
            {translate('bridge.confirmAndClaim')}
          </Button>
        </Stack>
      </CardFooter>
    </SlideTransition>
  )
}
