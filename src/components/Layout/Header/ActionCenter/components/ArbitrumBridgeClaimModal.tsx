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
} from '@chakra-ui/react'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from '@shapeshiftoss/utils'
import { noop } from 'lodash'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { useArbitrumClaimTx } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimTx'
import { Row } from '@/components/Row/Row'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { firstFourLastFour } from '@/lib/utils'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

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
  const dispatch = useAppDispatch()
  const claimDetails = action.arbitrumBridgeMetadata.claimDetails
  const isClaimAvailable = action.status === ActionStatus.ClaimAvailable && !!claimDetails
  const isClaimCompleted = action.status === ActionStatus.Claimed

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

  const handleClaimSuccess = useCallback(
    (claimTxHash: string) => {
      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          updatedAt: Date.now(),
          status: ActionStatus.Claimed,
          arbitrumBridgeMetadata: {
            ...action.arbitrumBridgeMetadata,
            claimTxHash,
          },
        }),
      )
    },
    [dispatch, action],
  )

  const claimTxResult = useArbitrumClaimTx(
    claimDetails,
    destinationAccountId,
    noop,
    noop,
    handleClaimSuccess,
  )

  const evmFeesResult = claimTxResult?.evmFeesResult

  const claimMutation = claimTxResult?.claimMutation

  const hasEnoughDestinationFeeBalance = useMemo(() => {
    if (!destinationFeeAsset) return true
    if (!evmFeesResult?.data?.networkFeeCryptoBaseUnit) return true

    return bnOrZero(evmFeesResult.data.networkFeeCryptoBaseUnit).lte(
      toBaseUnit(destinationFeeAssetBalanceCryptoPrecision, destinationFeeAsset.precision),
    )
  }, [destinationFeeAsset, destinationFeeAssetBalanceCryptoPrecision, evmFeesResult?.data])

  const handleSubmit = useCallback(async () => {
    if (!claimMutation) return
    await claimMutation.mutateAsync()
    onClose()
  }, [claimMutation, onClose])

  const confirmCopy = useMemo(() => {
    if (claimMutation?.isError) return translate('trade.errors.title')

    if (evmFeesResult?.isError) {
      return translate('trade.errors.networkFeeEstimateFailed')
    }

    if (!hasEnoughDestinationFeeBalance)
      return translate('common.insufficientAmountForGas', {
        assetSymbol: destinationFeeAsset?.symbol,
        chainSymbol: destinationFeeAsset?.chainId
          ? getChainShortName(destinationFeeAsset.chainId as KnownChainIds)
          : '',
      })

    return translate('bridge.confirmAndClaim')
  }, [claimMutation, destinationFeeAsset, evmFeesResult, hasEnoughDestinationFeeBalance, translate])

  useEffect(() => {
    if (!isClaimCompleted) return

    onClose()
  }, [isClaimCompleted, onClose])

  if (!asset || !destinationAsset) return null

  // Shouldn't happen but it may for a few renders after claim - handle gracefully to avoid us crashing in a disgusting way
  if (!isClaimAvailable && !isClaimCompleted) {
    return null
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
                  <Skeleton isLoaded={!evmFeesResult?.isFetching}>
                    <Amount.Fiat value={evmFeesResult?.data?.txFeeFiat ?? '0.00'} />
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
              !hasEnoughDestinationFeeBalance || claimMutation?.isError || evmFeesResult?.isError
                ? 'red'
                : 'blue'
            }
            isDisabled={
              !evmFeesResult?.isSuccess ||
              evmFeesResult?.isPending ||
              claimMutation?.isPending ||
              !hasEnoughDestinationFeeBalance
            }
            isLoading={evmFeesResult?.isFetching || claimMutation?.isPending}
            onClick={handleSubmit}
          >
            {confirmCopy}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
