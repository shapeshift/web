import './SwapWidget.css'

import { ethChainId, usdcAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMachine } from '@xstate/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chain, WalletClient } from 'viem'
import { createPublicClient, encodeFunctionData, http } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
} from 'viem/chains'

import { createApiClient } from '../api/client'
import { getBaseAsset } from '../constants/chains'
import { useChainInfo } from '../hooks/useAssets'
import { useMultiChainBalance } from '../hooks/useBalances'
import { useBitcoinSigning } from '../hooks/useBitcoinSigning'
import { formatUsdValue, useMarketData } from '../hooks/useMarketData'
import { useSolanaSigning } from '../hooks/useSolanaSigning'
import { useSwapRates } from '../hooks/useSwapRates'
import { swapMachine } from '../machines/swapMachine'
import type { CheckStatusParams } from '../services/transactionStatus'
import { checkTransactionStatus } from '../services/transactionStatus'
import type { Asset, SwapWidgetProps, ThemeMode, TradeRate } from '../types'
import { formatAmount, getChainType, getEvmNetworkId, parseAmount } from '../types'
import { AddressInputModal } from './AddressInputModal'
import { ApprovalStep } from './ApprovalStep'
import { ExecutionStep } from './ExecutionStep'
import { InputStep } from './InputStep'
import { SettingsModal } from './SettingsModal'
import { StatusStep } from './StatusStep'
import { TokenSelectModal } from './TokenSelectModal'
import { ConnectWalletButton, InternalWalletProvider } from './WalletProvider'

const VIEM_CHAINS_BY_ID: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  56: bsc,
  100: gnosis,
  137: polygon,
  143: monad,
  999: hyperEvm,
  8453: base,
  9745: plasma,
  42161: arbitrum,
  43114: avalanche,
  747474: katana,
}

const addChainToWallet = async (client: WalletClient, chain: Chain): Promise<void> => {
  const { id, name, nativeCurrency, rpcUrls, blockExplorers } = chain

  await client.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${id.toString(16)}`,
        chainName: name,
        nativeCurrency,
        rpcUrls: rpcUrls.default.http,
        blockExplorerUrls: blockExplorers?.default ? [blockExplorers.default.url] : undefined,
      },
    ],
  })
}

const switchOrAddChain = async (client: WalletClient, chainId: number): Promise<void> => {
  const chain = VIEM_CHAINS_BY_ID[chainId]

  try {
    await client.switchChain({ id: chainId })
  } catch (error) {
    const switchError = error as { code?: number; message?: string }
    const isChainNotAddedError =
      switchError.code === 4902 ||
      switchError.message?.toLowerCase().includes('unrecognized chain') ||
      switchError.message?.toLowerCase().includes('chain not added') ||
      switchError.message?.toLowerCase().includes('try adding the chain')

    if (isChainNotAddedError && chain) {
      await addChainToWallet(client, chain)
      await client.switchChain({ id: chainId })
    } else {
      throw error
    }
  }
}

const DEFAULT_SELL_ASSET: Asset = {
  assetId: ethereum.assetId,
  chainId: ethereum.chainId,
  symbol: ethereum.symbol,
  name: ethereum.name,
  precision: ethereum.precision,
  icon: ethereum.icon,
  networkName: ethereum.networkName,
  explorer: ethereum.explorer,
  explorerTxLink: ethereum.explorerTxLink,
  explorerAddressLink: ethereum.explorerAddressLink,
}

const DEFAULT_BUY_ASSET: Asset = {
  assetId: usdcAssetId,
  chainId: ethChainId,
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
  icon: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

type SwapWidgetInnerProps = SwapWidgetProps & {
  apiClient: ReturnType<typeof createApiClient>
}

type SwapWidgetCoreProps = SwapWidgetInnerProps & {
  enableWalletConnection?: boolean
}

const POLL_INTERVAL_MS = 5000

const SwapWidgetCore = ({
  defaultSellAsset = DEFAULT_SELL_ASSET,
  defaultBuyAsset = DEFAULT_BUY_ASSET,
  disabledChainIds = [],
  disabledAssetIds = [],
  allowedChainIds,
  walletClient,
  onConnectWallet,
  onSwapSuccess,
  onSwapError,
  onAssetSelect,
  theme = 'dark',
  defaultSlippage = '0.5',
  showPoweredBy = true,
  defaultReceiveAddress,
  enableWalletConnection = false,
  apiClient,
}: SwapWidgetCoreProps) => {
  const [state, send] = useMachine(swapMachine)

  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [customReceiveAddress, setCustomReceiveAddress] = useState<string>('')

  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const buyChainType = getChainType(state.context.buyAsset.chainId)

  const {
    isConnected: isBitcoinConnected,
    address: bitcoinAddress,
    sendTransfer: sendBitcoinTransfer,
    signPsbt,
    state: bitcoinState,
    reset: resetBitcoinState,
  } = useBitcoinSigning()

  const {
    isConnected: isSolanaConnected,
    address: solanaAddress,
    connection: solanaConnection,
    sendTransaction: sendSolanaTransaction,
    state: solanaState,
    reset: resetSolanaState,
  } = useSolanaSigning()

  const walletAddress = useMemo(() => {
    if (!walletClient) return undefined
    return (walletClient as WalletClient).account?.address
  }, [walletClient])

  const effectiveReceiveAddress = useMemo(() => {
    if (customReceiveAddress) return customReceiveAddress
    if (defaultReceiveAddress) return defaultReceiveAddress

    if (buyChainType === 'utxo') return bitcoinAddress ?? ''
    if (buyChainType === 'solana') return solanaAddress ?? ''
    if (buyChainType === 'evm') return walletAddress ?? ''

    return ''
  }, [
    customReceiveAddress,
    defaultReceiveAddress,
    buyChainType,
    bitcoinAddress,
    solanaAddress,
    walletAddress,
  ])

  const isCustomAddress = useMemo(() => {
    return !!customReceiveAddress && customReceiveAddress !== walletAddress
  }, [customReceiveAddress, walletAddress])

  const initialSyncRef = useRef(false)
  useEffect(() => {
    if (initialSyncRef.current) return
    initialSyncRef.current = true
    send({ type: 'SET_SELL_ASSET', asset: defaultSellAsset })
    send({ type: 'SET_BUY_ASSET', asset: defaultBuyAsset })
    send({ type: 'SET_SLIPPAGE', slippage: defaultSlippage })
  }, [defaultSellAsset, defaultBuyAsset, defaultSlippage, send])

  useEffect(() => {
    send({ type: 'SET_WALLET_ADDRESS', address: walletAddress })
  }, [walletAddress, send])

  useEffect(() => {
    send({ type: 'SET_RECEIVE_ADDRESS', address: effectiveReceiveAddress })
  }, [effectiveReceiveAddress, send])

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: state.context.sellAsset.assetId,
    buyAssetId: state.context.buyAsset.assetId,
    sellAmountCryptoBaseUnit: state.context.sellAmountBaseUnit,
    enabled:
      !!state.context.sellAmountBaseUnit &&
      state.context.sellAmountBaseUnit !== '0' &&
      (state.context.isSellAssetEvm ||
        state.context.isSellAssetUtxo ||
        state.context.isSellAssetSolana),
  })

  const {
    data: sellAssetBalance,
    isLoading: isSellBalanceLoading,
    refetch: refetchSellBalance,
  } = useMultiChainBalance(
    walletAddress,
    bitcoinAddress,
    solanaAddress,
    state.context.sellAsset.assetId,
    state.context.sellAsset.precision,
  )

  const buyAssetAddressForBalance = useMemo(() => {
    if (buyChainType === 'evm') return effectiveReceiveAddress || walletAddress
    if (buyChainType === 'utxo') return effectiveReceiveAddress || bitcoinAddress
    if (buyChainType === 'solana') return effectiveReceiveAddress || solanaAddress
    return effectiveReceiveAddress
  }, [buyChainType, effectiveReceiveAddress, walletAddress, bitcoinAddress, solanaAddress])

  const {
    data: buyAssetBalance,
    isLoading: isBuyBalanceLoading,
    refetch: refetchBuyBalance,
  } = useMultiChainBalance(
    buyChainType === 'evm' ? buyAssetAddressForBalance : walletAddress,
    buyChainType === 'utxo' ? buyAssetAddressForBalance : bitcoinAddress,
    buyChainType === 'solana' ? buyAssetAddressForBalance : solanaAddress,
    state.context.buyAsset.assetId,
    state.context.buyAsset.precision,
  )

  const { data: sellChainInfo } = useChainInfo(state.context.sellAsset.chainId)
  const { data: buyChainInfo } = useChainInfo(state.context.buyAsset.chainId)
  const displayRate = useMemo(
    () => state.context.selectedRate ?? rates?.[0],
    [state.context.selectedRate, rates],
  )
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  const sellChainNativeAsset = useMemo(
    () => getBaseAsset(state.context.sellAsset.chainId),
    [state.context.sellAsset.chainId],
  )

  const assetIdsForPrices = useMemo(() => {
    const ids = [state.context.sellAsset.assetId, state.context.buyAsset.assetId]
    if (sellChainNativeAsset && sellChainNativeAsset.assetId !== state.context.sellAsset.assetId) {
      ids.push(sellChainNativeAsset.assetId)
    }
    return ids
  }, [state.context.sellAsset.assetId, state.context.buyAsset.assetId, sellChainNativeAsset])
  const { data: marketData } = useMarketData(assetIdsForPrices)
  const sellAssetUsdPrice = marketData?.[state.context.sellAsset.assetId]?.price
  const buyAssetUsdPrice = marketData?.[state.context.buyAsset.assetId]?.price
  const nativeAssetUsdPrice = sellChainNativeAsset
    ? marketData?.[sellChainNativeAsset.assetId]?.price
    : undefined

  const networkFeeDisplay = useMemo(() => {
    const feeBaseUnit = displayRate?.networkFeeCryptoBaseUnit
    if (!feeBaseUnit || feeBaseUnit === '0' || !sellChainNativeAsset) return undefined
    const formatted = formatAmount(feeBaseUnit, sellChainNativeAsset.precision, 6)
    const cryptoPart = `${formatted} ${sellChainNativeAsset.symbol}`
    if (!nativeAssetUsdPrice) return cryptoPart
    const fiatValue = formatUsdValue(
      feeBaseUnit,
      sellChainNativeAsset.precision,
      nativeAssetUsdPrice,
    )
    return `${cryptoPart} (${fiatValue})`
  }, [displayRate?.networkFeeCryptoBaseUnit, sellChainNativeAsset, nativeAssetUsdPrice])

  const sellUsdValue = useMemo(() => {
    if (!state.context.sellAmountBaseUnit || !sellAssetUsdPrice) return '$0.00'
    return formatUsdValue(
      state.context.sellAmountBaseUnit,
      state.context.sellAsset.precision,
      sellAssetUsdPrice,
    )
  }, [state.context.sellAmountBaseUnit, state.context.sellAsset.precision, sellAssetUsdPrice])

  const buyUsdValue = useMemo(() => {
    if (!buyAmount || !buyAssetUsdPrice) return '$0.00'
    return formatUsdValue(buyAmount, state.context.buyAsset.precision, buyAssetUsdPrice)
  }, [buyAmount, state.context.buyAsset.precision, buyAssetUsdPrice])

  const handleSwapTokens = useCallback(() => {
    const tempSell = state.context.sellAsset
    const tempBuy = state.context.buyAsset
    send({ type: 'SET_SELL_ASSET', asset: tempBuy })
    send({ type: 'SET_BUY_ASSET', asset: tempSell })
    send({ type: 'SET_SELL_AMOUNT', amount: '', amountBaseUnit: undefined })
  }, [state.context.sellAsset, state.context.buyAsset, send])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      send({ type: 'SET_SELL_ASSET', asset })
      onAssetSelect?.('sell', asset)
    },
    [send, onAssetSelect],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      send({ type: 'SET_BUY_ASSET', asset })
      onAssetSelect?.('buy', asset)
    },
    [send, onAssetSelect],
  )

  const handleSellAmountChange = useCallback(
    (value: string) => {
      const baseUnit = value ? parseAmount(value, state.context.sellAsset.precision) : undefined
      send({ type: 'SET_SELL_AMOUNT', amount: value, amountBaseUnit: baseUnit })
    },
    [send, state.context.sellAsset.precision],
  )

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      send({ type: 'SELECT_RATE', rate })
    },
    [send],
  )

  const handleSlippageChange = useCallback(
    (value: string) => {
      send({ type: 'SET_SLIPPAGE', slippage: value })
    },
    [send],
  )

  const redirectToShapeShift = useCallback(() => {
    const params = new URLSearchParams({
      sellAssetId: state.context.sellAsset.assetId,
      buyAssetId: state.context.buyAsset.assetId,
      sellAmount: state.context.sellAmount,
    })
    window.open(
      `https://app.shapeshift.com/trade?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, [state.context.sellAsset.assetId, state.context.buyAsset.assetId, state.context.sellAmount])

  const handleButtonClick = useCallback(() => {
    if (state.context.isSellAssetUtxo && !isBitcoinConnected) {
      return
    }
    if (state.context.isSellAssetSolana && !isSolanaConnected) {
      return
    }
    if (!walletClient && state.context.isSellAssetEvm && onConnectWallet) {
      onConnectWallet()
      return
    }
    if (
      !state.context.isSellAssetEvm &&
      !state.context.isSellAssetUtxo &&
      !state.context.isSellAssetSolana
    ) {
      redirectToShapeShift()
      return
    }
    send({ type: 'FETCH_QUOTE' })
  }, [
    state.context.isSellAssetUtxo,
    state.context.isSellAssetSolana,
    state.context.isSellAssetEvm,
    isBitcoinConnected,
    isSolanaConnected,
    walletClient,
    onConnectWallet,
    redirectToShapeShift,
    send,
  ])

  const quotingRef = useRef(false)
  useEffect(() => {
    if (!state.matches('quoting') || quotingRef.current) return
    quotingRef.current = true

    const fetchQuote = async () => {
      try {
        if (sellAssetBalance?.balance && state.context.sellAmountBaseUnit) {
          const balanceBigInt = BigInt(sellAssetBalance.balance)
          const amountBigInt = BigInt(state.context.sellAmountBaseUnit)
          if (amountBigInt > balanceBigInt) {
            send({ type: 'QUOTE_ERROR', error: 'Insufficient balance' })
            return
          }
        }

        const slippageDecimal = (parseFloat(state.context.slippage) / 100).toString()
        const rateToUse = state.context.selectedRate ?? rates?.[0]
        if (!rateToUse || !state.context.sellAmountBaseUnit) {
          send({ type: 'QUOTE_ERROR', error: 'No rate or amount available' })
          return
        }

        const sendAddress = state.context.isSellAssetEvm
          ? walletAddress
          : state.context.isSellAssetUtxo
          ? bitcoinAddress
          : solanaAddress

        if (!sendAddress) {
          send({ type: 'QUOTE_ERROR', error: 'No wallet address available' })
          return
        }

        const receiveAddr = effectiveReceiveAddress || sendAddress

        const response = await apiClient.getQuote({
          sellAssetId: state.context.sellAsset.assetId,
          buyAssetId: state.context.buyAsset.assetId,
          sellAmountCryptoBaseUnit: state.context.sellAmountBaseUnit,
          sendAddress,
          receiveAddress: receiveAddr,
          swapperName: rateToUse.swapperName,
          slippageTolerancePercentageDecimal: slippageDecimal,
        })

        send({ type: 'QUOTE_SUCCESS', quote: response })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get quote'
        send({ type: 'QUOTE_ERROR', error: errorMessage })
      } finally {
        quotingRef.current = false
      }
    }

    fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const approvingRef = useRef(false)
  useEffect(() => {
    if (!state.matches('approving') || approvingRef.current) return
    approvingRef.current = true

    const executeApproval = async () => {
      try {
        if (!walletClient || !walletAddress) {
          send({ type: 'APPROVAL_ERROR', error: 'No wallet connected' })
          return
        }

        const quote = state.context.quote
        if (!quote?.approval?.spender) {
          send({ type: 'APPROVAL_ERROR', error: 'No approval data in quote' })
          return
        }

        const sellAssetAddress = state.context.sellAsset.assetId.split('/')[1]?.split(':')[1]
        if (!sellAssetAddress) {
          send({ type: 'APPROVAL_ERROR', error: 'Could not extract token address' })
          return
        }

        const requiredChainId = getEvmNetworkId(state.context.sellAsset.chainId)
        const client = walletClient as WalletClient

        const currentChainId = await client.getChainId()
        if (currentChainId !== requiredChainId) {
          await switchOrAddChain(client, requiredChainId)
        }

        const baseAsset = getBaseAsset(state.context.sellAsset.chainId)
        const nativeCurrency = baseAsset
          ? { name: baseAsset.name, symbol: baseAsset.symbol, decimals: baseAsset.precision }
          : { name: 'ETH', symbol: 'ETH', decimals: 18 }

        const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
        const chain = viemChain ?? {
          id: requiredChainId,
          name: baseAsset?.networkName ?? baseAsset?.name ?? 'Chain',
          nativeCurrency,
          rpcUrls: { default: { http: [] } },
        }

        const approvalData = encodeFunctionData({
          abi: [
            {
              name: 'approve',
              type: 'function',
              inputs: [
                { name: 'spender', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
            },
          ],
          functionName: 'approve',
          args: [
            quote.approval.spender as `0x${string}`,
            BigInt(state.context.sellAmountBaseUnit ?? '0'),
          ],
        })

        const approvalHash = await client.sendTransaction({
          to: sellAssetAddress as `0x${string}`,
          data: approvalData,
          value: BigInt(0),
          chain,
          account: walletAddress as `0x${string}`,
        })

        const publicClient = createPublicClient({ chain, transport: http() })
        await publicClient.waitForTransactionReceipt({ hash: approvalHash })

        send({ type: 'APPROVAL_SUCCESS', txHash: approvalHash })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Approval failed'
        send({ type: 'APPROVAL_ERROR', error: errorMessage })
      } finally {
        approvingRef.current = false
      }
    }

    executeApproval()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const executingRef = useRef(false)
  useEffect(() => {
    if (!state.matches('executing') || executingRef.current) return
    executingRef.current = true

    const executeSwap = async () => {
      try {
        const quote = state.context.quote
        if (!quote) {
          send({ type: 'EXECUTE_ERROR', error: 'No quote available' })
          return
        }

        if (state.context.isSellAssetEvm) {
          if (!walletClient || !walletAddress) {
            send({ type: 'EXECUTE_ERROR', error: 'No wallet connected' })
            return
          }

          const requiredChainId = getEvmNetworkId(state.context.sellAsset.chainId)
          const client = walletClient as WalletClient

          const currentChainId = await client.getChainId()
          if (currentChainId !== requiredChainId) {
            await switchOrAddChain(client, requiredChainId)
          }

          const baseAsset = getBaseAsset(state.context.sellAsset.chainId)
          const nativeCurrency = baseAsset
            ? { name: baseAsset.name, symbol: baseAsset.symbol, decimals: baseAsset.precision }
            : { name: 'ETH', symbol: 'ETH', decimals: 18 }

          const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
          const chain = viemChain ?? {
            id: requiredChainId,
            name: baseAsset?.networkName ?? baseAsset?.name ?? 'Chain',
            nativeCurrency,
            rpcUrls: { default: { http: [] } },
          }

          const outerStep = quote.steps?.[0]
          const innerStep = quote.quote?.steps?.[0]

          const transactionData =
            quote.transactionData ??
            outerStep?.transactionData ??
            outerStep?.relayTransactionMetadata ??
            outerStep?.butterSwapTransactionMetadata ??
            innerStep?.transactionData ??
            innerStep?.relayTransactionMetadata ??
            innerStep?.butterSwapTransactionMetadata

          if (!transactionData) {
            throw new Error(
              `No transaction data returned. Response keys: ${Object.keys(quote).join(', ')}`,
            )
          }

          const to = transactionData.to as string
          const data = transactionData.data as string
          const value = transactionData.value ?? '0'
          const gasLimit = transactionData.gasLimit as string | undefined

          const txHash = await client.sendTransaction({
            to: to as `0x${string}`,
            data: data as `0x${string}`,
            value: BigInt(value),
            gas: gasLimit ? BigInt(gasLimit) : undefined,
            chain,
            account: walletAddress as `0x${string}`,
          })

          send({ type: 'EXECUTE_SUCCESS', txHash })
        } else if (state.context.isSellAssetUtxo) {
          if (!isBitcoinConnected || !bitcoinAddress) {
            send({ type: 'EXECUTE_ERROR', error: 'Bitcoin wallet not connected' })
            return
          }

          resetBitcoinState()

          const outerStep = quote.steps?.[0]
          const innerStep = quote.quote?.steps?.[0]
          const transactionData =
            quote.transactionData ?? outerStep?.transactionData ?? innerStep?.transactionData

          if (!transactionData) {
            throw new Error(
              `No transaction data returned. Response keys: ${Object.keys(quote).join(', ')}`,
            )
          }

          const psbt = (transactionData as { psbt?: string }).psbt
          const recipientAddress = transactionData.to
          const value = transactionData.value ?? state.context.sellAmountBaseUnit

          let txid: string

          if (psbt) {
            txid = await signPsbt({ psbt, signInputs: {}, broadcast: true })
          } else if (recipientAddress) {
            txid = await sendBitcoinTransfer({ recipientAddress, amount: value ?? '' })
          } else {
            throw new Error('No PSBT or recipient address in transaction data')
          }

          send({ type: 'EXECUTE_SUCCESS', txHash: txid })
        } else if (state.context.isSellAssetSolana) {
          if (!isSolanaConnected || !solanaAddress || !solanaConnection) {
            send({ type: 'EXECUTE_ERROR', error: 'Solana wallet not connected' })
            return
          }

          resetSolanaState()

          const innerStep = quote.quote?.steps?.[0]
          const solanaTransactionMetadata = (innerStep as Record<string, unknown> | undefined)
            ?.solanaTransactionMetadata as
            | {
                instructions: {
                  programId: string
                  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[]
                  data: { data: number[] }
                }[]
              }
            | undefined

          if (!solanaTransactionMetadata?.instructions) {
            throw new Error(
              `No Solana transaction metadata returned. Response keys: ${Object.keys(quote).join(
                ', ',
              )}`,
            )
          }

          const { Transaction, PublicKey, TransactionInstruction } = await import('@solana/web3.js')

          const instructions = solanaTransactionMetadata.instructions.map(
            (ix: {
              programId: string
              keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[]
              data: { data: number[] }
            }) => {
              const keys = ix.keys.map(
                (key: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
                  pubkey: new PublicKey(key.pubkey),
                  isSigner: key.isSigner,
                  isWritable: key.isWritable,
                }),
              )

              if (!ix.data?.data) {
                throw new Error(`Invalid instruction data for programId: ${ix.programId}`)
              }
              const data = Buffer.from(ix.data.data)

              return new TransactionInstruction({
                keys,
                programId: new PublicKey(ix.programId),
                data,
              })
            },
          )

          const transaction = new Transaction().add(...instructions)
          const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed')
          transaction.recentBlockhash = blockhash
          transaction.feePayer = new PublicKey(solanaAddress)

          const signature = await sendSolanaTransaction({ transaction })
          send({ type: 'EXECUTE_SUCCESS', txHash: signature })
        } else {
          send({ type: 'EXECUTE_ERROR', error: 'Unsupported chain type' })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
        send({ type: 'EXECUTE_ERROR', error: errorMessage })
      } finally {
        executingRef.current = false
      }
    }

    executeSwap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const pollingRef = useRef(false)
  useEffect(() => {
    if (!state.matches('polling_status')) {
      pollingRef.current = false
      return
    }
    if (pollingRef.current) return
    pollingRef.current = true

    let stopped = false

    const poll = async () => {
      if (stopped || !state.context.txHash) return

      try {
        let statusParams: CheckStatusParams

        if (state.context.isSellAssetEvm) {
          statusParams = {
            txHash: state.context.txHash,
            chainType: 'evm',
            chainId: getEvmNetworkId(state.context.sellAsset.chainId),
          }
        } else if (state.context.isSellAssetUtxo) {
          statusParams = {
            txHash: state.context.txHash,
            chainType: 'utxo',
          }
        } else if (state.context.isSellAssetSolana) {
          statusParams = {
            txHash: state.context.txHash,
            chainType: 'solana',
            connection: solanaConnection as CheckStatusParams['connection'],
          }
        } else {
          send({ type: 'STATUS_CONFIRMED' })
          return
        }

        const result = await checkTransactionStatus(statusParams)

        if (stopped) return

        if (result.status === 'confirmed') {
          send({ type: 'STATUS_CONFIRMED' })
          return
        }

        if (result.status === 'failed') {
          send({ type: 'STATUS_FAILED', error: result.error ?? 'Transaction failed' })
          return
        }

        setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (stopped) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown polling error'
        send({ type: 'STATUS_FAILED', error: errorMessage })
      }
    }

    poll()

    return () => {
      stopped = true
      pollingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const completionRef = useRef(false)
  useEffect(() => {
    if (!state.matches('complete')) {
      completionRef.current = false
      return
    }
    if (completionRef.current) return
    completionRef.current = true

    if (state.context.txHash) {
      onSwapSuccess?.(state.context.txHash)
    }

    refetchSellBalance?.()
    refetchBuyBalance?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const errorRef = useRef(false)
  useEffect(() => {
    if (!state.matches('error')) {
      errorRef.current = false
      return
    }
    if (errorRef.current) return
    errorRef.current = true

    onSwapError?.(new Error(state.context.error ?? 'Unknown error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value])

  const widgetStyle = useMemo(() => {
    if (!themeConfig) return undefined
    const style: Record<string, string> = {}
    if (themeConfig.accentColor) {
      style['--ssw-accent'] = themeConfig.accentColor
      style['--ssw-accent-light'] = `${themeConfig.accentColor}1a`
    }
    if (themeConfig.backgroundColor) {
      style['--ssw-bg-secondary'] = themeConfig.backgroundColor
      style['--ssw-bg-primary'] = themeConfig.backgroundColor
    }
    if (themeConfig.cardColor) {
      style['--ssw-bg-tertiary'] = themeConfig.cardColor
      style['--ssw-bg-input'] = themeConfig.cardColor
    }
    if (themeConfig.textColor) {
      style['--ssw-text-primary'] = themeConfig.textColor
    }
    if (themeConfig.borderRadius) {
      style['--ssw-border-radius'] = themeConfig.borderRadius
    }
    return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined
  }, [themeConfig])

  const openAddressModal = useCallback(() => setIsAddressModalOpen(true), [])

  return (
    <div
      className={`ssw-widget ${themeMode === 'light' ? 'ssw-light' : 'ssw-dark'}`}
      style={widgetStyle}
    >
      <div className='ssw-header'>
        <span className='ssw-header-title'>Swap</span>
        <div className='ssw-header-actions'>
          {enableWalletConnection && <ConnectWalletButton />}
          <button
            className='ssw-settings-btn'
            onClick={() => setIsSettingsOpen(true)}
            type='button'
            title='Settings'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='3' />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
          </button>
        </div>
      </div>

      <div className='ssw-step-container'>
        {(state.matches('idle') || state.matches('input') || state.matches('quoting')) && (
          <InputStep
            context={state.context}
            send={send}
            rates={rates ?? []}
            isLoadingRates={isLoadingRates}
            ratesError={ratesError}
            sellAssetBalance={sellAssetBalance}
            buyAssetBalance={buyAssetBalance}
            isSellBalanceLoading={isSellBalanceLoading}
            isBuyBalanceLoading={isBuyBalanceLoading}
            sellUsdValue={sellUsdValue}
            buyUsdValue={buyUsdValue}
            sellChainInfo={sellChainInfo}
            buyChainInfo={buyChainInfo}
            displayRate={displayRate}
            walletAddress={walletAddress}
            bitcoinAddress={bitcoinAddress}
            solanaAddress={solanaAddress}
            defaultReceiveAddress={defaultReceiveAddress}
            buyAssetUsdPrice={buyAssetUsdPrice}
            onOpenTokenModal={setTokenModalType}
            onOpenAddressModal={openAddressModal}
            enableWalletConnection={enableWalletConnection}
            onConnectWallet={onConnectWallet}
            bitcoinState={bitcoinState}
            solanaState={solanaState}
            isQuoting={state.matches('quoting')}
            isExecuting={false}
            effectiveReceiveAddress={effectiveReceiveAddress}
            isCustomAddress={isCustomAddress}
            sellAmount={state.context.sellAmount}
            onSellAmountChange={handleSellAmountChange}
            onSwapTokens={handleSwapTokens}
            onSelectRate={handleSelectRate}
            onButtonClick={handleButtonClick}
            sellAmountBaseUnit={state.context.sellAmountBaseUnit}
            networkFeeDisplay={networkFeeDisplay}
          />
        )}

        {(state.matches('approval_needed') || state.matches('approving')) && (
          <ApprovalStep
            context={state.context}
            send={send}
            isApproving={state.matches('approving')}
          />
        )}

        {state.matches('executing') && <ExecutionStep context={state.context} send={send} />}

        {(state.matches('polling_status') ||
          state.matches('complete') ||
          state.matches('error')) && (
          <StatusStep
            context={state.context}
            send={send}
            isPolling={state.matches('polling_status')}
            isComplete={state.matches('complete')}
            isError={state.matches('error')}
          />
        )}
      </div>

      {showPoweredBy && (
        <div className='ssw-powered-by'>
          Powered by{' '}
          <a
            href='https://shapeshift.com'
            target='_blank'
            rel='noopener noreferrer'
            className='ssw-powered-by-link'
          >
            <svg width='16' height='16' viewBox='0 0 57 62' fill='currentColor'>
              <path d='M51.67 5.1L48.97 21.3L39.37 10L51.67 5.1ZM49.03 28.27L51.43 37.14L33.06 42.2L49.03 28.27ZM9.03 23.8L18.88 10.93H35.99L46.92 23.8H9.03ZM45.66 26.99L27.85 42.53L9.7 26.99H45.66ZM15.58 10.01L6.78 21.51L4.08 5.17L15.58 10.01ZM22.57 42.2L4.02 37.15L6.56 28.48L22.57 42.2ZM25.99 46.43L22.49 50.28C19.53 47.46 16.26 44.96 12.78 42.83L25.99 46.43ZM42.98 42.77C39.5 44.94 36.24 47.47 33.29 50.32L29.72 46.42L42.98 42.77ZM55.73 0.06L36.42 7.75H18.42L0 0L4.18 25.3L0.17 38.99L10.65 45.26C15.61 48.23 20.06 51.94 23.86 56.3L27.94 60.97L32.23 56.06C35.9 51.84 40.18 48.22 44.95 45.29L55.23 38.99L51.52 25.31L55.73 0.06Z' />
            </svg>
            ShapeShift
          </a>
        </div>
      )}

      <TokenSelectModal
        isOpen={tokenModalType !== null}
        onClose={() => setTokenModalType(null)}
        onSelect={tokenModalType === 'sell' ? handleSellAssetSelect : handleBuyAssetSelect}
        disabledAssetIds={disabledAssetIds}
        disabledChainIds={disabledChainIds}
        allowedChainIds={allowedChainIds}
        walletAddress={walletAddress}
        currentAssetIds={[state.context.sellAsset.assetId, state.context.buyAsset.assetId]}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={state.context.slippage}
        onSlippageChange={handleSlippageChange}
      />

      <AddressInputModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        chainId={state.context.buyAsset.chainId}
        chainName={
          buyChainInfo?.name ?? state.context.buyAsset.networkName ?? state.context.buyAsset.name
        }
        currentAddress={customReceiveAddress || effectiveReceiveAddress || ''}
        onAddressChange={setCustomReceiveAddress}
        walletAddress={
          buyChainType === 'evm'
            ? walletAddress
            : buyChainType === 'utxo'
            ? bitcoinAddress
            : buyChainType === 'solana'
            ? solanaAddress
            : undefined
        }
      />
    </div>
  )
}

const SwapWidgetWithExternalWallet = (props: SwapWidgetProps) => {
  const apiClient = useMemo(
    () => createApiClient({ baseUrl: props.apiBaseUrl, apiKey: props.apiKey }),
    [props.apiBaseUrl, props.apiKey],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SwapWidgetCore {...props} apiClient={apiClient} />
    </QueryClientProvider>
  )
}

const SwapWidgetWithInternalWallet = (
  props: SwapWidgetProps & { walletConnectProjectId: string },
) => {
  const apiClient = useMemo(
    () => createApiClient({ baseUrl: props.apiBaseUrl, apiKey: props.apiKey }),
    [props.apiBaseUrl, props.apiKey],
  )

  return (
    <InternalWalletProvider projectId={props.walletConnectProjectId}>
      {walletClient => (
        <QueryClientProvider client={queryClient}>
          <SwapWidgetCore
            {...props}
            walletClient={walletClient}
            apiClient={apiClient}
            enableWalletConnection={true}
          />
        </QueryClientProvider>
      )}
    </InternalWalletProvider>
  )
}

export const SwapWidget = (props: SwapWidgetProps) => {
  if (props.enableWalletConnection && props.walletConnectProjectId) {
    return (
      <SwapWidgetWithInternalWallet
        {...props}
        walletConnectProjectId={props.walletConnectProjectId}
      />
    )
  }

  return <SwapWidgetWithExternalWallet {...props} />
}
