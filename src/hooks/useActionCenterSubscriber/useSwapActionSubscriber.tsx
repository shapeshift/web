import { Box, Flex, Icon, Text, useColorModeValue, usePrevious, useToast } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Swap } from '@shapeshiftoss/swapper'
import { fetchSafeTransactionInfo, swappers, SwapStatus } from '@shapeshiftoss/swapper'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { TbCircleCheckFilled, TbCircleXFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { fetchIsSmartContractAddressQuery } from '../useIsSmartContractAddress/useIsSmartContractAddress'
import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '../useWallet/useWallet'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getTxLink } from '@/lib/getTxLink'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  selectPendingSwapActions,
  selectSwapActionBySwapId,
} from '@/state/slices/actionSlice/selectors'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType, isSwapAction } from '@/state/slices/actionSlice/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

type UseSwapActionSubscriberProps = {
  onDrawerOpen: () => void
}

export const useSwapActionSubscriber = ({ onDrawerOpen }: UseSwapActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const toastColor = useColorModeValue('white', 'gray.900')

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const toast = useToast({
    render: ({ title, status, description, onClose }) => {
      const handleClick = () => {
        onClose()
        onDrawerOpen()
      }

      const toastSx = {
        '&:hover': {
          cursor: 'pointer',
          background: status === 'success' ? 'green.300' : 'red.300',
        },
      }

      return (
        <Flex
          // We can't memo this because onClose prop comes from the render props
          // eslint-disable-next-line react-memo/require-usememo
          onClick={handleClick}
          background={status === 'success' ? 'green.500' : 'red.500'}
          color='white'
          px={4}
          py={2}
          borderRadius='md'
          // eslint-disable-next-line react-memo/require-usememo
          sx={toastSx}
        >
          <Box py={1} me={2}>
            {status === 'success' ? (
              <Icon color={toastColor} as={TbCircleCheckFilled} height='20px' width='20px' />
            ) : (
              <Icon color={toastColor} as={TbCircleXFilled} height='20px' width='20px' />
            )}
          </Box>
          <Box>
            <Text fontWeight='bold' color={toastColor}>
              {title}
            </Text>
            <Text color={toastColor}>{description}</Text>
          </Box>
        </Flex>
      )
    },
  })

  const pendingSwapActions = useAppSelector(selectPendingSwapActions)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)
  const {
    state: { isConnected },
  } = useWallet()
  const activeSwapId = useAppSelector(swapSlice.selectors.selectActiveSwapId)
  const previousSwapStatus = usePrevious(activeSwapId ? swapsById[activeSwapId]?.status : undefined)

  // Create swap and action after user confirmed the intent
  useEffect(() => {
    if (!activeSwapId) return

    const activeSwap = swapsById[activeSwapId]

    if (!activeSwap) return

    if (activeSwap.status !== SwapStatus.Pending) return
    if (previousSwapStatus === activeSwap.status) return

    const existingSwapAction = selectSwapActionBySwapId(store.getState(), {
      swapId: activeSwap.id,
    })

    if (existingSwapAction) return

    dispatch(
      actionSlice.actions.upsertAction({
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        type: ActionType.Swap,
        status: ActionStatus.Pending,
        title: translate('notificationCenter.swapTitle', {
          sellAmountAndSymbol: toCrypto(
            fromBaseUnit(activeSwap.sellAmountCryptoBaseUnit, activeSwap.sellAsset.precision),
            activeSwap.sellAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
          buyAmountAndSymbol: toCrypto(
            fromBaseUnit(activeSwap.buyAmountCryptoBaseUnit, activeSwap.buyAsset.precision),
            activeSwap.buyAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
        }),
        swapMetadata: {
          swapId: activeSwap.id,
        },
      }),
    )
  }, [dispatch, translate, toCrypto, activeSwapId, swapsById, previousSwapStatus])

  const swapStatusHandler = useCallback(
    async (swap: Swap, action: SwapAction) => {
      const maybeSwapper = swappers[swap.swapperName]

      if (maybeSwapper === undefined)
        throw new Error(`no swapper matching swapperName '${swap.swapperName}'`)

      const swapper = maybeSwapper

      if (!swap.sellAccountId) return
      if (!swap.sellTxHash) return

      const { status, message, buyTxHash } = await swapper.checkTradeStatus({
        txHash: swap.sellTxHash,
        chainId: swap.sellAsset.chainId,
        accountId: swap.sellAccountId,
        stepIndex: swap.metadata.stepIndex,
        swap,
        config: getConfig(),
        assertGetEvmChainAdapter,
        assertGetUtxoChainAdapter,
        assertGetCosmosSdkChainAdapter,
        assertGetSolanaChainAdapter,
        fetchIsSmartContractAddressQuery,
      })

      if (!buyTxHash) return

      const swapSellAsset = swap.sellAsset
      const swapBuyAsset = swap.buyAsset

      if (status === TxStatus.Confirmed) {
        const accountId = swap.sellAccountId
        const adapter = getChainAdapterManager().get(swap.sellAsset.chainId)

        if (adapter) {
          try {
            const tx = await (adapter as EvmChainAdapter).httpProvider.getTransaction({
              txid: buyTxHash,
            })

            const parsedTx = await adapter.parseTx(tx, fromAccountId(accountId).account)

            const feeAsset = selectFeeAssetByChainId(store.getState(), parsedTx?.chainId ?? '')

            const maybeSafeTx = await fetchSafeTransactionInfo({
              accountId,
              safeTxHash: buyTxHash,
              fetchIsSmartContractAddressQuery,
            })

            const txLink = getTxLink({
              stepSource: parsedTx.trade?.dexName,
              defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
              txId: tx.txid,
              maybeSafeTx,
              accountId,
            })

            if (parsedTx.transfers?.length) {
              const receiveTransfer = parsedTx.transfers.find(
                transfer =>
                  transfer.type === TransferType.Receive &&
                  transfer.assetId === swapBuyAsset.assetId,
              )

              if (receiveTransfer?.value) {
                dispatch(
                  swapSlice.actions.upsertSwap({
                    ...swap,
                    buyAmountCryptoBaseUnit: receiveTransfer.value,
                  }),
                )

                const notificationTitle = translate('notificationCenter.swapTitle', {
                  sellAmountAndSymbol: toCrypto(
                    fromBaseUnit(swap.sellAmountCryptoBaseUnit, swapSellAsset.precision),
                    swapSellAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                  buyAmountAndSymbol: toCrypto(
                    fromBaseUnit(receiveTransfer.value, swapBuyAsset.precision),
                    swapBuyAsset.symbol,
                    {
                      maximumFractionDigits: 8,
                      omitDecimalTrailingZeros: true,
                      abbreviated: true,
                      truncateLargeNumbers: true,
                    },
                  ),
                })

                dispatch(
                  actionSlice.actions.upsertAction({
                    ...action,
                    title: notificationTitle,
                    swapMetadata: {
                      swapId: swap.id,
                    },
                    status: ActionStatus.Complete,
                  }),
                )
                dispatch(
                  swapSlice.actions.upsertSwap({
                    ...swap,
                    status: SwapStatus.Success,
                    txLink,
                  }),
                )

                toast({
                  title: notificationTitle,
                  status: 'success',
                })
                return
              }
            }
          } catch (error) {
            console.error('Failed to fetch transaction details:', error)

            dispatch(
              actionSlice.actions.upsertAction({
                ...action,
                swapMetadata: {
                  swapId: swap.id,
                },
                status: ActionStatus.Complete,
              }),
            )
            dispatch(
              swapSlice.actions.upsertSwap({
                ...swap,
                status: SwapStatus.Success,
              }),
            )

            const notificationTitle = selectSwapActionBySwapId(store.getState(), {
              swapId: swap.id,
            })?.title

            toast({
              title: notificationTitle,
              status: 'success',
            })

            return
          }
        }

        const notificationTitle = translate('notificationCenter.swapTitle', {
          sellAmountAndSymbol: toCrypto(
            fromBaseUnit(swap.sellAmountCryptoBaseUnit, swapSellAsset.precision),
            swapSellAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
          buyAmountAndSymbol: toCrypto(
            fromBaseUnit(swap.buyAmountCryptoBaseUnit, swapBuyAsset.precision),
            swapBuyAsset.symbol,
            {
              maximumFractionDigits: 8,
              omitDecimalTrailingZeros: true,
              abbreviated: true,
              truncateLargeNumbers: true,
            },
          ),
        })
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            swapMetadata: {
              swapId: swap.id,
            },
            status: ActionStatus.Complete,
          }),
        )
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            status: SwapStatus.Success,
          }),
        )

        toast({
          title: notificationTitle,
          status: 'success',
        })
      }

      if (status === TxStatus.Failed) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            title: translate('notificationCenter.swapTitle'),
            status: ActionStatus.Failed,
            swapMetadata: {
              swapId: swap.id,
            },
          }),
        )
        dispatch(
          swapSlice.actions.upsertSwap({
            ...swap,
            status: SwapStatus.Failed,
          }),
        )

        toast({
          title: translate('notificationCenter.swapError'),
          status: 'error',
        })
      }

      return {
        status,
        message,
        buyTxHash,
      }
    },
    [toCrypto, translate, toast, dispatch],
  )

  // Update actions status when swap is confirmed or failed
  const actionsQueries = useMemo(() => {
    return pendingSwapActions
      .map(action => {
        const swapId = action.swapMetadata.swapId
        if (!swapId) return undefined

        const swap = swapsById[swapId]

        if (!swap) return undefined

        return {
          queryKey: ['action', action.id, swap.id, swap.sellTxHash],
          queryFn: () => swapStatusHandler(swap, action),
          refetchInterval: 10000,
          enabled: Boolean(
            isSwapAction(action) && action.status === ActionStatus.Pending && isConnected,
          ),
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingSwapActions, isConnected, swapsById, swapStatusHandler])

  useQueries({
    queries: actionsQueries,
  })
}
