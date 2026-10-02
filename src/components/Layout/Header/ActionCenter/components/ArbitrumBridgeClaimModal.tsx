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
import { fromAccountId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { BigAmount, getChainShortName } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { zeroAddress } from 'viem'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { useArbitrumClaims } from '@/hooks/useArbitrumClaims/useArbitrumClaims'
import { useArbitrumClaimTx } from '@/hooks/useArbitrumClaims/useArbitrumClaimTx'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { middleEllipsis } from '@/lib/utils'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectEnabledWalletAccountIds } from '@/state/slices/common-selectors'
import {
  selectArbitrumBridgeWithdrawActionById,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

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
  const { withdrawTxHash, destinationAccountId } = action.arbitrumBridgeMetadata
  const isClaimAvailable = action.status === ActionStatus.ClaimAvailable
  const isClaimCompleted = action.status === ActionStatus.Claimed

  // The outbox call is permissionless, so the destination account pays when the wallet holds it,
  // otherwise its first ethereum account does, the funds land at the destination either way
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const claimAccountId = useMemo(() => {
    if (enabledWalletAccountIds.includes(destinationAccountId)) return destinationAccountId

    return enabledWalletAccountIds.find(
      accountId => fromAccountId(accountId).chainId === fromAccountId(destinationAccountId).chainId,
    )
  }, [enabledWalletAccountIds, destinationAccountId])

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

  const { claimsByTxid } = useArbitrumClaims({ isPolling: false })

  // Claimable withdraws aren't polled, recheck this one wasn't claimed elsewhere before claiming it
  useEffect(() => {
    if (!isOpen) return
    queryClient.invalidateQueries({ queryKey: ['claimStatus', { txid: withdrawTxHash }] })
  }, [isOpen, withdrawTxHash])
  const claimDetails = useMemo(() => {
    const claim = claimsByTxid[withdrawTxHash]
    return claim?.status === ActionStatus.ClaimAvailable ? claim : undefined
  }, [claimsByTxid, withdrawTxHash])

  const destinationFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(
      state,
      fromAccountId(action.arbitrumBridgeMetadata.destinationAccountId).chainId,
    ),
  )

  const destinationFeeAssetBalanceFilter = useMemo(
    () => ({
      accountId: claimAccountId,
      assetId: destinationFeeAsset?.assetId,
    }),
    [claimAccountId, destinationFeeAsset],
  )

  const destinationFeeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, destinationFeeAssetBalanceFilter),
  ).toPrecision()

  const amountCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: action.arbitrumBridgeMetadata.amountCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
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

  // Pending until the subscriber sees the claim confirm, or revert or drop back to claimable
  const handleClaimBroadcast = useCallback(
    (claimTxHash: string) => {
      const latestAction = selectArbitrumBridgeWithdrawActionById(store.getState(), action.id)
      if (!latestAction || latestAction.status !== ActionStatus.ClaimAvailable) return

      dispatch(
        actionSlice.actions.upsertAction({
          ...latestAction,
          status: ActionStatus.Pending,
          arbitrumBridgeMetadata: { ...latestAction.arbitrumBridgeMetadata, claimTxHash },
        }),
      )
      onClose()
    },
    [dispatch, action.id, onClose],
  )

  const claimTxResult = useArbitrumClaimTx(claimDetails, claimAccountId, handleClaimBroadcast)

  const executeTransactionDataResult = claimTxResult?.executeTransactionDataResult

  const evmFeesResult = claimTxResult?.evmFeesResult

  const claimMutation = claimTxResult?.claimMutation

  const hasEnoughDestinationFeeBalance = useMemo(() => {
    if (!destinationFeeAsset) return true
    if (!evmFeesResult?.data?.networkFeeCryptoBaseUnit) return true

    return bnOrZero(evmFeesResult.data.networkFeeCryptoBaseUnit).lte(
      BigAmount.fromPrecision({
        value: destinationFeeAssetBalanceCryptoPrecision,
        precision: destinationFeeAsset.precision,
      }).toBaseUnit(),
    )
  }, [destinationFeeAsset, destinationFeeAssetBalanceCryptoPrecision, evmFeesResult?.data])

  // A failed broadcast keeps the modal open with the error copy on the button
  const onConfirm = useCallback(() => claimMutation?.mutate(), [claimMutation])

  const confirmCopy = useMemo(() => {
    if (isClaimCompleted) return translate('common.close')

    if (executeTransactionDataResult?.isError) return translate('bridge.claimTxDataFailed')

    if (claimMutation?.isError) return translate('trade.errors.title')

    if (evmFeesResult?.isError) return translate('trade.errors.networkFeeEstimateFailed')

    if (!hasEnoughDestinationFeeBalance)
      return translate('common.insufficientAmountForGas', {
        assetSymbol: destinationFeeAsset?.symbol ?? '',
        chainSymbol: getChainShortName(destinationFeeAsset?.chainId as KnownChainIds),
      })

    return translate('bridge.confirmAndClaim')
  }, [
    isClaimCompleted,
    claimMutation,
    destinationFeeAsset,
    evmFeesResult?.isError,
    executeTransactionDataResult?.isError,
    hasEnoughDestinationFeeBalance,
    translate,
  ])

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose,
  })

  if (!asset || !destinationAsset || !destinationFeeAsset) return null

  // Shouldn't happen but it may for a few renders after claim - handle gracefully to avoid us crashing in a disgusting way
  if (!isClaimAvailable && !isClaimCompleted) {
    return null
  }

  return (
    <Modal size='md' {...modalProps}>
      <ModalOverlay {...overlayProps} />
      <ModalContent pointerEvents='all' {...modalContentProps}>
        <ModalHeader>
          {translate(isClaimCompleted ? 'bridge.alreadyClaimed' : 'common.confirm')}
        </ModalHeader>
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
                  <Skeleton isLoaded={Boolean(claimDetails)}>
                    {middleEllipsis(claimDetails?.destinationAddress ?? zeroAddress)}
                  </Skeleton>
                </Row.Value>
              </Row>
              {isClaimCompleted ? (
                <Text
                  fontSize='sm'
                  color='text.subtle'
                  textAlign='center'
                  translation='bridge.alreadyClaimedBody'
                />
              ) : (
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('common.gasFee')}</Row.Label>
                  <Row.Value>
                    <Skeleton
                      isLoaded={
                        Boolean(claimDetails) &&
                        !executeTransactionDataResult?.isFetching &&
                        !evmFeesResult?.isFetching
                      }
                    >
                      <Amount.Fiat value={evmFeesResult?.data?.txFeeFiat ?? '0'} />
                    </Skeleton>
                  </Row.Value>
                </Row>
              )}
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            width='full'
            size='lg'
            colorScheme={
              !isClaimCompleted &&
              (!hasEnoughDestinationFeeBalance ||
                executeTransactionDataResult?.isError ||
                claimMutation?.isError ||
                evmFeesResult?.isError)
                ? 'red'
                : 'blue'
            }
            isDisabled={
              !isClaimCompleted &&
              (!hasEnoughDestinationFeeBalance ||
                !evmFeesResult?.isSuccess ||
                evmFeesResult?.isPending ||
                claimMutation?.isPending)
            }
            isLoading={
              // A missing claim resolves on the next status poll
              !isClaimCompleted &&
              (!claimDetails ||
                executeTransactionDataResult?.isFetching ||
                evmFeesResult?.isFetching ||
                claimMutation?.isPending)
            }
            onClick={isClaimCompleted ? onClose : onConfirm}
          >
            {confirmCopy}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
