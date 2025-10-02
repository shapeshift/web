import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { getChainShortName } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { useArbitrumClaimTx } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimTx'
import { Row } from '@/components/Row/Row'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { firstFourLastFour } from '@/lib/utils'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ArbitrumBridgeClaimModalProps = {
  action: ArbitrumBridgeWithdrawAction
  isOpen: boolean
  onClose: () => void
}

export const ArbitrumBridgeClaimModal = ({
  action,
  isOpen,
  onClose,
}: ArbitrumBridgeClaimModalProps) => {
  const translate = useTranslate()
  const [_claimTxHash, setClaimTxHash] = useState<string>('')
  const [_claimTxStatus, setClaimTxStatus] = useState<TxStatus>()

  // Get claim details and check if claim is available
  const claimDetails = action.arbitrumBridgeMetadata.claimDetails
  const isClaimAvailable = action.status === ActionStatus.ClaimAvailable && !!claimDetails

  // Call all hooks first before any conditional logic
  const asset = useAppSelector(state =>
    selectAssetById(state, action.arbitrumBridgeMetadata.assetId),
  )
  const destinationAsset = useAppSelector(state =>
    selectAssetById(state, action.arbitrumBridgeMetadata.destinationAssetId),
  )

  const assetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, action.arbitrumBridgeMetadata.assetId),
  )

  const destinationAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, action.arbitrumBridgeMetadata.destinationAssetId),
  )

  const destinationAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, action.arbitrumBridgeMetadata.destinationChainId),
  )

  const destinationFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, action.arbitrumBridgeMetadata.destinationChainId),
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
    () => fromBaseUnit(action.arbitrumBridgeMetadata.amountCryptoBaseUnit, asset?.precision ?? 0),
    [action.arbitrumBridgeMetadata.amountCryptoBaseUnit, asset],
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

  // Always call hook but handle null case inside
  const claimTxResult = useArbitrumClaimTx(
    claimDetails || ({} as any), // Pass empty object when null to avoid hook error
    destinationAccountId,
    setClaimTxHash,
    setClaimTxStatus,
  )

  const evmFeesResult = useMemo(
    () =>
      claimTxResult?.evmFeesResult ?? {
        data: null,
        isLoading: false,
        isPending: false,
        isError: false,
        isSuccess: false,
      },
    [claimTxResult?.evmFeesResult],
  )

  const claimMutation = useMemo(
    () =>
      claimTxResult?.claimMutation ?? {
        mutateAsync: () => {
          throw new Error('Claim not available')
        },
        isError: false,
        isPending: false,
      },
    [claimTxResult?.claimMutation],
  )

  const hasEnoughDestinationFeeBalance = useMemo(() => {
    if (!destinationFeeAsset) return true
    if (!evmFeesResult.data?.networkFeeCryptoBaseUnit) return true

    return bnOrZero(evmFeesResult.data.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(destinationFeeAssetBalanceCryptoPrecision, destinationFeeAsset.precision),
    )
  }, [destinationFeeAsset, destinationFeeAssetBalanceCryptoPrecision, evmFeesResult.data])

  const handleSubmit = useCallback(async () => {
    try {
      await claimMutation.mutateAsync()
      onClose()
    } catch (error) {
      console.error('Claim failed:', error)
    }
  }, [claimMutation, onClose])

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

  // Don't render if no assets
  if (!asset || !destinationAsset) {
    return null
  }

  // Show error state if claim is not available
  if (!isClaimAvailable) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{translate('common.error')}</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <Text textAlign='center' color='text.subtle'>
              {translate('bridge.claimNotAvailable')}
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button width='full' onClick={onClose}>
              {translate('common.close')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='md'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('common.confirm')}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Stack spacing={6} align='center'>
            <AssetIcon size='lg' assetId={destinationAsset.assetId} />

            <Stack textAlign='center' spacing={1}>
              <Amount.Crypto
                fontWeight='bold'
                fontSize='xl'
                value={amountCryptoPrecision}
                symbol={destinationAsset.symbol}
              />
              <Amount.Fiat fontSize='md' color='text.subtle' value={amountUserCurrency} />
            </Stack>

            <Stack spacing={4} width='full'>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('bridge.claimReceiveAddress')}</Row.Label>
                <Row.Value>
                  {firstFourLastFour(action.arbitrumBridgeMetadata.destinationAddress)}
                </Row.Value>
              </Row>

              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('common.gasFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!evmFeesResult.isLoading && !evmFeesResult.isPending}>
                    <Amount.Fiat value={evmFeesResult?.data?.txFeeFiat || '0.00'} />
                  </Skeleton>
                </Row.Value>
              </Row>
            </Stack>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button
            width='full'
            size='lg'
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
