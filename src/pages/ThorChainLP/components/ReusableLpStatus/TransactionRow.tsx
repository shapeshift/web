import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Link,
  Skeleton,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { assetIdToThorPoolAssetId, SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { Row } from '@/components/Row/Row'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { sleep } from '@/lib/poll/poll'
import { assertUnreachable } from '@/lib/utils'
import { getThorchainFromAddress, waitForThorchainUpdate } from '@/lib/utils/thorchain'
import { THORCHAIN_AFFILIATE_NAME } from '@/lib/utils/thorchain/constants'
import { useIsChainHalted } from '@/lib/utils/thorchain/hooks/useIsChainHalted'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { useThorchainFromAddress } from '@/lib/utils/thorchain/hooks/useThorchainFromAddress'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from '@/lib/utils/thorchain/lp/types'
import { AsymSide } from '@/lib/utils/thorchain/lp/types'
import {
  isLpConfirmedDepositQuote,
  isLpConfirmedWithdrawalQuote,
} from '@/lib/utils/thorchain/lp/utils'
import { getThorchainLpPosition } from '@/pages/ThorChainLP/queries/queries'
import { fromOpportunityId, fromQuote } from '@/pages/ThorChainLP/utils'
import { reactQueries } from '@/react-queries'
import { useIsTradingActive } from '@/react-queries/hooks/useIsTradingActive'
import { selectInboundAddressData } from '@/react-queries/selectors'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectPortfolioAccountMetadataByAccountId,
  selectTxById,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type TransactionRowProps = {
  assetId: AssetId
  poolAssetId: AssetId
  amountCryptoPrecision: string
  onStatusUpdate: (status: TxStatus) => void
  onStart: () => void
  isActive?: boolean
  isLast?: boolean
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  poolAssetId,
  amountCryptoPrecision,
  onStatusUpdate,
  onStart,
  isActive,
  confirmedQuote,
}) => {
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const mixpanel = getMixPanel()
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const [status, setStatus] = useState(TxStatus.Unknown)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txFeeCryptoPrecision, setTxFeeCryptoPrecision] = useState<string | undefined>()

  const { currentAccountIdByChainId, positionStatus } = confirmedQuote
  const { opportunityType, action, actionSide } = fromQuote(confirmedQuote)

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const isSymAssetWithdraw =
    action === 'withdraw' && actionSide === AsymSide.Asset && opportunityType === 'sym'

  const isRuneTx = useMemo(
    () => assetId === thorchainAssetId || isSymAssetWithdraw,
    [assetId, isSymAssetWithdraw],
  )

  const isNativeThorchainTx = useMemo(
    () => fromAssetId(assetId).chainId === thorchainChainId || isSymAssetWithdraw,
    [assetId, isSymAssetWithdraw],
  )

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(isRuneTx ? thorchainAssetId : assetId).chainId),
  )

  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId))
  const baseAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const poolAssets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []

    switch (actionSide) {
      case 'sym':
        return [baseAsset, poolAsset]
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(actionSide)
    }
  }, [poolAsset, baseAsset, actionSide])

  const { assetAmountsAndSymbols, poolName } = useMemo(() => {
    if (!(poolAsset && baseAsset)) return { assetAmountsAndSymbols: '', poolName: '' }
    if (!isLpConfirmedWithdrawalQuote(confirmedQuote))
      return { assetAmountsAndSymbols: '', poolName: '' }

    const assetAmount = confirmedQuote.assetWithdrawAmountCryptoPrecision
    const runeAmount = confirmedQuote.runeWithdrawAmountCryptoPrecision
    const poolName = `${poolAsset.symbol}/${baseAsset.symbol}`

    if (poolAssets.length === 2) {
      const assetAmountsAndSymbols = translate('thorchainLp.pairAssets', {
        asset1: `${assetAmount} ${poolAsset.symbol}`,
        asset2: `${runeAmount} ${baseAsset.symbol}`,
      })

      return { assetAmountsAndSymbols, poolName }
    }
    if (actionSide === AsymSide.Asset) {
      const assetAmount = confirmedQuote.assetWithdrawAmountCryptoPrecision
      const assetAmountsAndSymbols = `${assetAmount} ${poolAsset.symbol}`

      return { assetAmountsAndSymbols, poolName }
    }
    if (actionSide === AsymSide.Rune) {
      const runeAmount = confirmedQuote.runeWithdrawAmountCryptoPrecision
      const assetAmountsAndSymbols = `${runeAmount} ${baseAsset.symbol}`

      return { assetAmountsAndSymbols, poolName }
    }

    return { assetAmountsAndSymbols: '', poolName: '' }
  }, [poolAsset, baseAsset, confirmedQuote, actionSide, poolAssets.length, translate])

  const poolAssetAccountId = currentAccountIdByChainId[fromAssetId(poolAssetId).chainId]
  const poolAssetAccountFilter = useMemo(
    () => ({ accountId: poolAssetAccountId }),
    [poolAssetAccountId],
  )
  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountFilter),
  )

  const runeAccountId = currentAccountIdByChainId[thorchainChainId]
  const runeAccountFilter = useMemo(() => ({ accountId: runeAccountId }), [runeAccountId])
  const runeAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, runeAccountFilter),
  )

  const isDeposit = isLpConfirmedDepositQuote(confirmedQuote)
  const isSymWithdraw = isLpConfirmedWithdrawalQuote(confirmedQuote) && actionSide === 'sym'

  const fromAccountId = useMemo(() => {
    return isRuneTx ? runeAccountId : poolAssetAccountId
  }, [isRuneTx, runeAccountId, poolAssetAccountId])

  const fromAccountMetadata = useMemo(() => {
    return isRuneTx ? runeAccountMetadata : poolAssetAccountMetadata
  }, [isRuneTx, runeAccountMetadata, poolAssetAccountMetadata])

  const { data: fromAddress } = useQuery({
    queryKey: [
      'thorchainFromAddress',
      fromAccountId,
      isRuneTx ? thorchainAssetId : poolAssetId,
      confirmedQuote.opportunityId,
    ],
    queryFn:
      fromAccountId && wallet && fromAccountId && fromAccountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId: fromAccountId,
              assetId: isRuneTx ? thorchainAssetId : poolAssetId,
              opportunityId: confirmedQuote.opportunityId,
              getPosition: getThorchainLpPosition,
              accountMetadata: fromAccountMetadata,
              wallet,
            })
        : skipToken,
  })

  const pairAssetAccountId = useMemo(() => {
    return isRuneTx ? poolAssetAccountId : runeAccountId
  }, [isRuneTx, runeAccountId, poolAssetAccountId])

  const pairAssetAccountMetadata = useMemo(() => {
    return isRuneTx ? poolAssetAccountMetadata : runeAccountMetadata
  }, [isRuneTx, runeAccountMetadata, poolAssetAccountMetadata])

  const { data: pairAssetAddress } = useThorchainFromAddress({
    accountId: pairAssetAccountId,
    assetId: isRuneTx ? poolAssetId : thorchainAssetId,
    opportunityId: confirmedQuote.opportunityId,
    wallet,
    accountMetadata: pairAssetAccountMetadata,
    getPosition: getThorchainLpPosition,
    // strip bech32 prefix for use in thorchain memo (bech32 not supported)
    select: address => {
      // Paranoia against previously cached calls, this should never happen but it could
      if (actionSide !== 'sym') return
      return address.replace('bitcoincash:', '')
    },
    enabled: Boolean(actionSide === 'sym'),
  })

  const thorchainNotationAssetId = useMemo(() => {
    // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
    // Left as-is for this PR to avoid a bigly diff
    return assetIdToThorPoolAssetId({ assetId: poolAssetId })
  }, [poolAssetId])

  const memo = useMemo(() => {
    if (thorchainNotationAssetId === undefined) return null
    if (actionSide === 'sym' && !pairAssetAddress) return null

    const pairedAddress = pairAssetAddress ?? ''

    const asymDestinationPoolAssetId =
      opportunityType === 'sym' && actionSide !== 'sym'
        ? assetIdToThorPoolAssetId({ assetId })
        : undefined

    return isDeposit
      ? `+:${thorchainNotationAssetId}:${pairedAddress}:${THORCHAIN_AFFILIATE_NAME}:${confirmedQuote.feeBps}`
      : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}${
          asymDestinationPoolAssetId ? `:${asymDestinationPoolAssetId}` : ''
        }`
  }, [
    actionSide,
    assetId,
    confirmedQuote,
    isDeposit,
    opportunityType,
    pairAssetAddress,
    thorchainNotationAssetId,
  ])

  const { executeTransaction, estimatedFeesData, txId, serializedTxIndex } = useSendThorTx({
    assetId: isRuneTx ? thorchainAssetId : poolAssetId,
    accountId: (isRuneTx ? runeAccountId : poolAssetAccountId) ?? null,
    amountCryptoBaseUnit: toBaseUnit(amountCryptoPrecision, asset?.precision ?? 0),
    memo,
    fromAddress: fromAddress ?? null,
    action: isDeposit ? 'addLiquidity' : 'withdrawLiquidity',
    disableEstimateFeesRefetch: isSubmitting,
  })

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: ({ txId: _txId }: { txId: string }) => {
      return waitForThorchainUpdate({
        txId: _txId,
        skipOutbound: true, // this is an LP Tx, there is no outbound
      }).promise
    },
    onSuccess: async () => {
      // More paranoia to ensure everything is nice and propagated - this works with debugger but doesn't without it,
      // indicating we need a bit more of artificial wait to ensure data is replicated across all endpoints
      await sleep(60_000)
      // Awaiting here for paranoia since this will actually refresh vs. using the sync version
      await queryClient.invalidateQueries({
        predicate: query => {
          // Paranoia using a predicate vs. a queryKey here, to ensure queries *actually* get invalidated
          const shouldInvalidate = query.queryKey?.[0] === reactQueries.thorchainLp._def[0]
          return shouldInvalidate
        },
        type: 'all',
      })

      setStatus(TxStatus.Confirmed)
      onStatusUpdate(TxStatus.Confirmed)
      setIsSubmitting(false)
    },
  })

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex ?? ''))

  // manages incomplete sym deposits by setting the already confirmed transaction as complete
  useEffect(() => {
    if (isLpConfirmedWithdrawalQuote(confirmedQuote)) return
    if (status !== TxStatus.Unknown) return
    if (!positionStatus?.incomplete) return
    if (positionStatus.incomplete.asset.assetId === assetId) return

    setStatus(TxStatus.Confirmed)
    onStatusUpdate(TxStatus.Confirmed)
  }, [assetId, confirmedQuote, onStatusUpdate, positionStatus?.incomplete, status])

  useEffect(() => {
    if (!txId) return

    // Return if the status has been set to confirmed or failed
    // - Confirmed means we got a successful status from thorchain and should not trigger the mutation again
    // - Failed means the inbound transaction failed and there is no reason to trigger the mutation as it will never be picked up by thorchain
    if (status === TxStatus.Confirmed || status === TxStatus.Failed) return

    // Consider native thorchain transactions pending after broadcast and start polling thorchain right away
    if (isNativeThorchainTx) {
      if (status === TxStatus.Unknown) {
        setStatus(TxStatus.Pending)
        onStatusUpdate(TxStatus.Pending)
        ;(async () => await mutateAsync({ txId }))()
      }
      return
    }

    if (!tx) return

    // Track pending status
    if (tx.status === TxStatus.Pending) {
      setStatus(tx.status)
      onStatusUpdate(TxStatus.Pending)
      return
    }

    // Track failed status, reset isSubmitting (tx failed and won't be picked up by thorchain), and handle onComplete
    if (tx.status === TxStatus.Failed) {
      setStatus(tx.status)
      onStatusUpdate(TxStatus.Failed)
      setIsSubmitting(false)
      return
    }

    if (tx.status === TxStatus.Confirmed) {
      ;(async () => await mutateAsync({ txId }))()
    }
  }, [mutateAsync, status, tx, txId, onStatusUpdate, isSymAssetWithdraw, isNativeThorchainTx])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // We technically don't care about going stale immediately here - halted checks are done JIT at signing time in case the pool went
    // halted by the time the user clicked the confirm button
    // But we still have some sane 60s stale time rather than 0 for paranoia's sake, as a balance of safety and not overfetching
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, assetId),
    enabled: !!assetId,
  })

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAssetId,
    enabled: !txId,
    swapperName: SwapperName.Thorchain,
  })

  const { isChainHalted, isFetching: isChainHaltedFetching } = useIsChainHalted(
    fromAssetId(assetId).chainId,
  )

  useEffect(() => {
    if (!estimatedFeesData || !feeAsset) return
    if (txId || isSubmitting) return

    setTxFeeCryptoPrecision(
      fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, feeAsset?.precision),
    )
  }, [estimatedFeesData, feeAsset, isSubmitting, txId])

  const txIdLink = useMemo(
    () =>
      getTxLink({
        defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
        txId: txId ?? '',
        stepSource: SwapperName.Thorchain,
        // THORFi is incompatible with SAFE wallets because msg.sender/tx.origin shenanigans, so this will never be a SAFE Tx
        maybeSafeTx: undefined,
        address: undefined,
        chainId: undefined,
      }),
    [txId],
  )

  const handleSignTx = useCallback(async () => {
    setIsSubmitting(true)
    mixpanel?.track(
      isDeposit ? MixPanelEvent.LpDepositInitiated : MixPanelEvent.LpWithdrawInitiated,
      confirmedQuote,
    )
    if (
      !(
        assetId &&
        poolAssetId &&
        asset &&
        feeAsset &&
        poolAsset &&
        wallet &&
        memo &&
        (isNativeThorchainTx || inboundAddressData?.address)
      )
    ) {
      setIsSubmitting(false)
      return
    }

    const _txId = await executeTransaction()
    if (!_txId) {
      setIsSubmitting(false)
      throw new Error('failed to broadcast transaction')
    }

    if (action === 'withdraw' && isLpConfirmedWithdrawalQuote(confirmedQuote)) {
      const assetId = isRuneTx
        ? thorchainAssetId
        : fromOpportunityId(confirmedQuote.opportunityId).assetId

      const accountId = confirmedQuote.currentAccountIdByChainId[fromAssetId(assetId).chainId]

      if (!accountId) {
        return
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: _txId,
          type: ActionType.Withdraw,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.ThorchainLP,
            message: 'actionCenter.thorchainLp.withdraw.processing',
            accountId,
            txHash: _txId,
            chainId: fromAssetId(assetId).chainId,
            assetId,
            amountCryptoPrecision: confirmedQuote.assetWithdrawAmountCryptoPrecision,
            confirmedQuote,
            assetAmountsAndSymbols,
            poolName,
          },
        }),
      )

      if (!toast.isActive(_txId)) {
        toast({
          id: _txId,
          duration: isDrawerOpen ? 5000 : null,
          status: 'success',
          render: ({ onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }
            return (
              <GenericTransactionNotification
                // eslint-disable-next-line react-memo/require-usememo
                handleClick={handleClick}
                actionId={_txId}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      }
    }

    onStart()
  }, [
    mixpanel,
    isDeposit,
    confirmedQuote,
    assetId,
    poolAssetId,
    asset,
    feeAsset,
    poolAsset,
    wallet,
    memo,
    isNativeThorchainTx,
    inboundAddressData?.address,
    executeTransaction,
    onStart,
    dispatch,
    action,
    toast,
    isDrawerOpen,
    assetAmountsAndSymbols,
    isRuneTx,
    poolName,
    openActionCenter,
  ])

  const confirmTranslation = useMemo(() => {
    if (isChainHalted) return translate('common.chainHalted')
    if (isTradingActive === false) return translate('common.poolHalted')
    if (status === TxStatus.Failed) return translate('common.transactionFailed')

    return translate('common.signTransaction')
  }, [isTradingActive, translate, status, isChainHalted])

  const txStatusIndicator = useMemo(() => {
    if (status === TxStatus.Confirmed) {
      return (
        <Center
          bg='background.success'
          boxSize='24px'
          borderRadius='full'
          color='text.success'
          fontSize='xs'
        >
          <FaCheck />
        </Center>
      )
    }

    if (status === TxStatus.Failed) {
      return (
        <Center
          bg='background.error'
          boxSize='24px'
          borderRadius='full'
          color='text.error'
          fontSize='xs'
        >
          <FaX />
        </Center>
      )
    }

    return <CircularProgress isIndeterminate={status === TxStatus.Pending} size='24px' />
  }, [status])

  if (!asset || !feeAsset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        {isSymWithdraw && poolAsset && (
          // Symmetrical withdrawals withdraw both asset amounts in a single TX.
          // In this case, we want to show the pool asset amount in additional to the rune amount for the user
          <>
            <AssetIcon size='xs' assetId={poolAsset.assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={confirmedQuote.assetWithdrawAmountCryptoPrecision}
              symbol={poolAsset.symbol ?? ''}
            />{' '}
          </>
        )}
        <Flex ml='auto' alignItems='center' gap={2}>
          {txId && (
            <Button as={Link} isExternal href={txIdLink} size='xs'>
              {translate('common.seeDetails')}
            </Button>
          )}
          {txStatusIndicator}
        </Flex>
      </CardHeader>
      <Collapse in={isActive}>
        <CardBody display='flex' flexDir='column' gap={2}>
          <Row fontSize='sm'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={Boolean(txFeeCryptoPrecision)}>
                <Amount.Crypto value={txFeeCryptoPrecision ?? '0'} symbol={feeAsset.symbol} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Button
            mx={-2}
            size='lg'
            colorScheme={
              isTradingActive === false || status === TxStatus.Failed || isChainHalted
                ? 'red'
                : 'blue'
            }
            onClick={handleSignTx}
            isDisabled={isTradingActive === false || isChainHalted || status === TxStatus.Failed}
            isLoading={
              isInboundAddressLoading ||
              isTradingActiveLoading ||
              isChainHaltedFetching ||
              !Boolean(txFeeCryptoPrecision) ||
              isSubmitting
            }
          >
            {confirmTranslation}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
