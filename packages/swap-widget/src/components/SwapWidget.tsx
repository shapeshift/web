import './SwapWidget.css'

import { ethChainId, usdcAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
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
  worldchain,
} from 'viem/chains'

import { createApiClient } from '../api/client'
import { getBaseAsset } from '../constants/chains'
import { useChainInfo } from '../hooks/useAssets'
import { useMultiChainBalance } from '../hooks/useBalances'
import { useBitcoinSigning } from '../hooks/useBitcoinSigning'
import { formatUsdValue, useMarketData } from '../hooks/useMarketData'
import { useSolanaSigning } from '../hooks/useSolanaSigning'
import { useSwapRates } from '../hooks/useSwapRates'
import type { Asset, SwapWidgetProps, ThemeMode, TradeRate } from '../types'
import { formatAmount, getChainType, getEvmNetworkId, parseAmount, truncateAddress } from '../types'
import { AddressInputModal } from './AddressInputModal'
import { QuoteSelector } from './QuoteSelector'
import { SettingsModal } from './SettingsModal'
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
  480: worldchain,
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
  const [sellAsset, setSellAsset] = useState<Asset>(defaultSellAsset)
  const [buyAsset, setBuyAsset] = useState<Asset>(defaultBuyAsset)
  const [sellAmount, setSellAmount] = useState('')
  const [selectedRate, setSelectedRate] = useState<TradeRate | null>(null)
  const [slippage, setSlippage] = useState(defaultSlippage)
  const [isExecuting, setIsExecuting] = useState(false)
  const [txStatus, setTxStatus] = useState<{
    status: 'pending' | 'success' | 'error'
    txHash?: string
    message?: string
  } | null>(null)

  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [customReceiveAddress, setCustomReceiveAddress] = useState<string>('')

  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const sellAmountBaseUnit = useMemo(
    () => (sellAmount ? parseAmount(sellAmount, sellAsset.precision) : undefined),
    [sellAmount, sellAsset.precision],
  )

  const sellChainType = getChainType(sellAsset.chainId)
  const buyChainType = getChainType(buyAsset.chainId)
  const isSellAssetEvm = sellChainType === 'evm'
  const isBuyAssetEvm = buyChainType === 'evm'
  const isSellAssetUtxo = sellChainType === 'utxo'
  const isSellAssetSolana = sellChainType === 'solana'
  const canExecuteDirectly = isSellAssetEvm
  const canExecuteUtxo = isSellAssetUtxo
  const canExecuteSolana = isSellAssetSolana

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

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit: sellAmountBaseUnit,
    enabled:
      !!sellAmountBaseUnit &&
      sellAmountBaseUnit !== '0' &&
      (isSellAssetEvm || isSellAssetUtxo || isSellAssetSolana),
  })

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

  const {
    data: sellAssetBalance,
    isLoading: isSellBalanceLoading,
    refetch: refetchSellBalance,
  } = useMultiChainBalance(
    walletAddress,
    bitcoinAddress,
    solanaAddress,
    sellAsset.assetId,
    sellAsset.precision,
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
    buyAsset.assetId,
    buyAsset.precision,
  )

  const handleSwapTokens = useCallback(() => {
    const tempSell = sellAsset
    setSellAsset(buyAsset)
    setBuyAsset(tempSell)
    setSellAmount('')
    setSelectedRate(null)
  }, [sellAsset, buyAsset])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      setSellAsset(asset)
      setSelectedRate(null)
      onAssetSelect?.('sell', asset)
    },
    [onAssetSelect],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      setBuyAsset(asset)
      setSelectedRate(null)
      onAssetSelect?.('buy', asset)
    },
    [onAssetSelect],
  )

  const executeUtxoSwap = useCallback(async () => {
    if (!isBitcoinConnected || !bitcoinAddress) return

    const rateToUse = selectedRate ?? rates?.[0]
    if (!rateToUse || !sellAmountBaseUnit) return

    if (sellAssetBalance?.balance) {
      const balanceBigInt = BigInt(sellAssetBalance.balance)
      const amountBigInt = BigInt(sellAmountBaseUnit)
      if (amountBigInt > balanceBigInt) {
        setTxStatus({ status: 'error', message: 'Insufficient balance' })
        return
      }
    }

    setIsExecuting(true)
    resetBitcoinState()

    try {
      const slippageDecimal = (parseFloat(slippage) / 100).toString()
      const quoteResponse = await apiClient.getQuote({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountBaseUnit,
        sendAddress: bitcoinAddress,
        receiveAddress: effectiveReceiveAddress || bitcoinAddress,
        swapperName: rateToUse.swapperName,
        slippageTolerancePercentageDecimal: slippageDecimal,
      })

      const transactionData = quoteResponse.steps?.[0]?.transactionData

      if (!transactionData) {
        throw new Error(
          `No transaction data returned. Response keys: ${Object.keys(quoteResponse).join(', ')}`,
        )
      }

      if (transactionData.type !== 'utxo_psbt' && transactionData.type !== 'utxo_deposit') {
        throw new Error(`Unexpected transaction type for UTXO swap: ${transactionData.type}`)
      }

      setTxStatus({ status: 'pending', message: 'Waiting for wallet confirmation...' })

      let txid: string

      if (transactionData.type === 'utxo_psbt') {
        txid = await signPsbt({ psbt: transactionData.psbt, signInputs: {}, broadcast: true })
      } else {
        txid = await sendBitcoinTransfer({
          recipientAddress: transactionData.depositAddress,
          amount: transactionData.value,
        })
      }

      setTxStatus({
        status: 'pending',
        txHash: txid,
        message: 'Transaction broadcast. Waiting for confirmation...',
      })

      setTxStatus({ status: 'success', txHash: txid, message: 'Transaction submitted!' })
      onSwapSuccess?.(txid)

      setSellAmount('')
      setSelectedRate(null)

      setTimeout(() => {
        refetchSellBalance?.()
        refetchBuyBalance?.()
      }, 10000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      setTxStatus({ status: 'error', message: errorMessage })
      onSwapError?.(error as Error)
    } finally {
      setIsExecuting(false)
    }
  }, [
    isBitcoinConnected,
    bitcoinAddress,
    selectedRate,
    rates,
    sellAmountBaseUnit,
    sellAssetBalance,
    resetBitcoinState,
    slippage,
    apiClient,
    sellAsset.assetId,
    buyAsset.assetId,
    effectiveReceiveAddress,
    signPsbt,
    sendBitcoinTransfer,
    onSwapSuccess,
    onSwapError,
    refetchSellBalance,
    refetchBuyBalance,
  ])

  const executeSolanaSwap = useCallback(async () => {
    if (!isSolanaConnected || !solanaAddress) return

    const rateToUse = selectedRate ?? rates?.[0]
    if (!rateToUse || !sellAmountBaseUnit) return

    if (sellAssetBalance?.balance) {
      const balanceBigInt = BigInt(sellAssetBalance.balance)
      const amountBigInt = BigInt(sellAmountBaseUnit)
      if (amountBigInt > balanceBigInt) {
        setTxStatus({ status: 'error', message: 'Insufficient balance' })
        return
      }
    }

    setIsExecuting(true)
    resetSolanaState()

    try {
      const slippageDecimal = (parseFloat(slippage) / 100).toString()
      const quoteResponse = await apiClient.getQuote({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountBaseUnit,
        sendAddress: solanaAddress,
        receiveAddress: effectiveReceiveAddress || solanaAddress,
        swapperName: rateToUse.swapperName,
        slippageTolerancePercentageDecimal: slippageDecimal,
      })

      const transactionData = quoteResponse.steps?.[0]?.transactionData

      if (!transactionData || transactionData.type !== 'solana') {
        throw new Error(
          `No Solana transaction data returned. Response keys: ${Object.keys(quoteResponse).join(
            ', ',
          )}`,
        )
      }

      setTxStatus({ status: 'pending', message: 'Waiting for wallet confirmation...' })

      if (!solanaConnection) {
        throw new Error('Solana connection not available')
      }

      const {
        AddressLookupTableAccount,
        PublicKey,
        TransactionInstruction,
        TransactionMessage,
        VersionedTransaction,
      } = await import('@solana/web3.js')

      const instructions = transactionData.instructions.map(ix => {
        const keys = ix.keys.map(key => ({
          pubkey: new PublicKey(key.pubkey),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        }))

        const data = Buffer.from(ix.data, 'base64')

        return new TransactionInstruction({
          keys,
          programId: new PublicKey(ix.programId),
          data,
        })
      })

      const { blockhash } = await solanaConnection.getLatestBlockhash('confirmed')

      let addressLookupTableAccounts: InstanceType<typeof AddressLookupTableAccount>[] = []

      if (transactionData.addressLookupTableAddresses.length > 0) {
        const altAddresses = transactionData.addressLookupTableAddresses.map(
          addr => new PublicKey(addr),
        )
        const altAccountInfos = await solanaConnection.getMultipleAccountsInfo(altAddresses)

        addressLookupTableAccounts = altAccountInfos.reduce<
          InstanceType<typeof AddressLookupTableAccount>[]
        >((acc, accountInfo, index) => {
          if (accountInfo) {
            acc.push(
              new AddressLookupTableAccount({
                key: altAddresses[index],
                state: AddressLookupTableAccount.deserialize(accountInfo.data),
              }),
            )
          }
          return acc
        }, [])
      }

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(solanaAddress),
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message(addressLookupTableAccounts)

      const transaction = new VersionedTransaction(messageV0)

      const signature = await sendSolanaTransaction({ transaction })

      setTxStatus({
        status: 'pending',
        txHash: signature,
        message: 'Transaction broadcast. Waiting for confirmation...',
      })

      setTxStatus({ status: 'success', txHash: signature, message: 'Transaction submitted!' })
      onSwapSuccess?.(signature)

      setSellAmount('')
      setSelectedRate(null)

      setTimeout(() => {
        refetchSellBalance?.()
        refetchBuyBalance?.()
      }, 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      setTxStatus({ status: 'error', message: errorMessage })
      onSwapError?.(error as Error)
    } finally {
      setIsExecuting(false)
    }
  }, [
    isSolanaConnected,
    solanaAddress,
    selectedRate,
    rates,
    sellAmountBaseUnit,
    sellAssetBalance,
    resetSolanaState,
    slippage,
    apiClient,
    sellAsset.assetId,
    buyAsset.assetId,
    effectiveReceiveAddress,
    solanaConnection,
    sendSolanaTransaction,
    onSwapSuccess,
    onSwapError,
    refetchSellBalance,
    refetchBuyBalance,
  ])

  const executeEvmSwap = useCallback(async () => {
    const rateToUse = selectedRate ?? rates?.[0]
    if (!rateToUse || !walletClient || !walletAddress) return

    if (sellAmountBaseUnit && sellAssetBalance?.balance) {
      const balanceBigInt = BigInt(sellAssetBalance.balance)
      const amountBigInt = BigInt(sellAmountBaseUnit)
      if (amountBigInt > balanceBigInt) {
        setTxStatus({ status: 'error', message: 'Insufficient balance' })
        return
      }
    }

    setIsExecuting(true)

    try {
      const requiredChainId = getEvmNetworkId(sellAsset.chainId)
      const client = walletClient as WalletClient

      const currentChainId = await client.getChainId()
      if (currentChainId !== requiredChainId) {
        await switchOrAddChain(client, requiredChainId)
      }

      if (!sellAmountBaseUnit) {
        throw new Error('Sell amount is required')
      }

      const slippageDecimal = (parseFloat(slippage) / 100).toString()
      const quoteResponse = await apiClient.getQuote({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountBaseUnit,
        sendAddress: walletAddress,
        receiveAddress: effectiveReceiveAddress || walletAddress,
        swapperName: rateToUse.swapperName,
        slippageTolerancePercentageDecimal: slippageDecimal,
      })

      const baseAsset = getBaseAsset(sellAsset.chainId)
      const nativeCurrency = baseAsset
        ? {
            name: baseAsset.name,
            symbol: baseAsset.symbol,
            decimals: baseAsset.precision,
          }
        : {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          }

      const viemChain = VIEM_CHAINS_BY_ID[requiredChainId]
      const chain = viemChain ?? {
        id: requiredChainId,
        name: baseAsset?.networkName ?? baseAsset?.name ?? 'Chain',
        nativeCurrency,
        rpcUrls: { default: { http: [] } },
      }

      if (quoteResponse.approval?.isRequired) {
        const sellAssetAddress = sellAsset.assetId.split('/')[1]?.split(':')[1]
        if (sellAssetAddress) {
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
            args: [quoteResponse.approval.spender as `0x${string}`, BigInt(sellAmountBaseUnit)],
          })

          const approvalHash = await client.sendTransaction({
            to: sellAssetAddress as `0x${string}`,
            data: approvalData,
            value: BigInt(0),
            chain,
            account: walletAddress as `0x${string}`,
          })

          const publicClient = createPublicClient({
            chain,
            transport: http(),
          })
          await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        }
      }

      const transactionData = quoteResponse.steps?.[0]?.transactionData

      if (!transactionData) {
        throw new Error(
          `No transaction data returned. Response keys: ${Object.keys(quoteResponse).join(', ')}`,
        )
      }

      if (transactionData.type !== 'evm') {
        throw new Error(
          `Unsupported transaction type: ${transactionData.type}. Only EVM transactions are supported.`,
        )
      }

      const { to, data, value, gasLimit } = transactionData

      setTxStatus({ status: 'pending', message: 'Waiting for confirmation...' })

      const txHash = await client.sendTransaction({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value: BigInt(value),
        gas: gasLimit ? BigInt(gasLimit) : undefined,
        chain,
        account: walletAddress as `0x${string}`,
      })

      setTxStatus({ status: 'success', txHash, message: 'Transaction submitted!' })
      onSwapSuccess?.(txHash)

      setSellAmount('')
      setSelectedRate(null)

      const isCrossChain = !isBuyAssetEvm || sellAsset.chainId !== buyAsset.chainId

      setTimeout(() => {
        refetchSellBalance?.()
      }, 3000)

      if (isCrossChain) {
        setTimeout(() => {
          refetchBuyBalance?.()
        }, 15000)

        setTimeout(() => {
          refetchBuyBalance?.()
        }, 30000)
      } else {
        setTimeout(() => {
          refetchBuyBalance?.()
        }, 3000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      setTxStatus({ status: 'error', message: errorMessage })
      onSwapError?.(error as Error)
    } finally {
      setIsExecuting(false)
    }
  }, [
    selectedRate,
    rates,
    walletClient,
    walletAddress,
    sellAmountBaseUnit,
    sellAssetBalance,
    slippage,
    apiClient,
    sellAsset.assetId,
    sellAsset.chainId,
    buyAsset.assetId,
    buyAsset.chainId,
    isBuyAssetEvm,
    effectiveReceiveAddress,
    onSwapSuccess,
    onSwapError,
    refetchSellBalance,
    refetchBuyBalance,
  ])

  const redirectToShapeShift = useCallback(() => {
    const params = new URLSearchParams({
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      sellAmount,
    })
    window.open(
      `https://app.shapeshift.com/trade?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, [sellAsset.assetId, buyAsset.assetId, sellAmount])

  const handleExecuteSwap = useCallback(() => {
    if (isSellAssetUtxo && canExecuteUtxo) {
      return executeUtxoSwap()
    }

    if (isSellAssetSolana && canExecuteSolana) {
      return executeSolanaSwap()
    }

    if (!isSellAssetEvm || !canExecuteDirectly) {
      return redirectToShapeShift()
    }

    return executeEvmSwap()
  }, [
    isSellAssetUtxo,
    canExecuteUtxo,
    executeUtxoSwap,
    isSellAssetSolana,
    canExecuteSolana,
    executeSolanaSwap,
    isSellAssetEvm,
    canExecuteDirectly,
    redirectToShapeShift,
    executeEvmSwap,
  ])

  const handleButtonClick = useCallback(() => {
    if (canExecuteUtxo && !isBitcoinConnected) {
      return
    }
    if (canExecuteSolana && !isSolanaConnected) {
      return
    }
    if (!walletClient && canExecuteDirectly && onConnectWallet) {
      onConnectWallet()
      return
    }
    handleExecuteSwap()
  }, [
    walletClient,
    canExecuteDirectly,
    canExecuteUtxo,
    canExecuteSolana,
    isBitcoinConnected,
    isSolanaConnected,
    onConnectWallet,
    handleExecuteSwap,
  ])

  const buttonText = useMemo(() => {
    if (isSellAssetUtxo && canExecuteUtxo) {
      if (!sellAmount) return 'Enter an amount'
      if (!isBitcoinConnected) return 'Connect Bitcoin Wallet'
      if (!effectiveReceiveAddress) return 'Enter receive address'
      if (bitcoinState.isLoading || isExecuting) return 'Executing...'
      if (isLoadingRates) return 'Finding rates...'
      if (ratesError) return 'No routes available'
      if (!rates?.length) return 'No routes found'
      return 'Swap'
    }
    if (isSellAssetSolana && canExecuteSolana) {
      if (!sellAmount) return 'Enter an amount'
      if (!isSolanaConnected) return 'Connect Solana Wallet'
      if (!effectiveReceiveAddress) return 'Enter receive address'
      if (solanaState.isLoading || isExecuting) return 'Executing...'
      if (isLoadingRates) return 'Finding rates...'
      if (ratesError) return 'No routes available'
      if (!rates?.length) return 'No routes found'
      return 'Swap'
    }
    if (!isSellAssetEvm) return 'Proceed on ShapeShift'
    if (!sellAmount) return 'Enter an amount'
    if (!walletClient && canExecuteDirectly) return 'Connect Wallet'
    if (!effectiveReceiveAddress) return 'Enter receive address'
    if (isLoadingRates) return 'Finding rates...'
    if (ratesError) return 'No routes available'
    if (!rates?.length) return 'No routes found'
    if (isExecuting) return 'Executing...'
    if (!canExecuteDirectly) return 'Proceed on ShapeShift'
    return 'Swap'
  }, [
    walletClient,
    canExecuteDirectly,
    canExecuteUtxo,
    canExecuteSolana,
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    isBitcoinConnected,
    isSolanaConnected,
    bitcoinState.isLoading,
    solanaState.isLoading,
    sellAmount,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
    effectiveReceiveAddress,
  ])

  const isButtonDisabled = useMemo(() => {
    if (!sellAmount || isLoadingRates || ratesError || !rates?.length || isExecuting) {
      return true
    }

    if (!effectiveReceiveAddress) {
      return true
    }

    if (isSellAssetUtxo && canExecuteUtxo) {
      return !isBitcoinConnected || bitcoinState.isLoading
    }

    if (isSellAssetSolana && canExecuteSolana) {
      return !isSolanaConnected || solanaState.isLoading
    }

    if (!isSellAssetEvm) {
      return false
    }

    return false
  }, [
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    canExecuteUtxo,
    canExecuteSolana,
    isBitcoinConnected,
    isSolanaConnected,
    bitcoinState.isLoading,
    solanaState.isLoading,
    sellAmount,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
    effectiveReceiveAddress,
  ])

  const { data: sellChainInfo } = useChainInfo(sellAsset.chainId)
  const { data: buyChainInfo } = useChainInfo(buyAsset.chainId)
  const displayRate = selectedRate ?? rates?.[0]
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  const assetIdsForPrices = useMemo(
    () => [sellAsset.assetId, buyAsset.assetId],
    [sellAsset.assetId, buyAsset.assetId],
  )
  const { data: marketData } = useMarketData(assetIdsForPrices)
  const sellAssetUsdPrice = marketData?.[sellAsset.assetId]?.price
  const buyAssetUsdPrice = marketData?.[buyAsset.assetId]?.price

  const sellUsdValue = useMemo(() => {
    if (!sellAmountBaseUnit || !sellAssetUsdPrice) return '$0.00'
    return formatUsdValue(sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice)
  }, [sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice])

  const buyUsdValue = useMemo(() => {
    if (!buyAmount || !buyAssetUsdPrice) return '$0.00'
    return formatUsdValue(buyAmount, buyAsset.precision, buyAssetUsdPrice)
  }, [buyAmount, buyAsset.precision, buyAssetUsdPrice])

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

      <div className='ssw-swap-container'>
        <div className='ssw-token-section ssw-sell'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Sell</span>
            {walletAddress && isSellAssetEvm && (
              <span className='ssw-wallet-badge'>{truncateAddress(walletAddress)}</span>
            )}
            {bitcoinAddress && isSellAssetUtxo && (
              <span className='ssw-wallet-badge'>{truncateAddress(bitcoinAddress)}</span>
            )}
            {solanaAddress && isSellAssetSolana && (
              <span className='ssw-wallet-badge'>{truncateAddress(solanaAddress)}</span>
            )}
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={sellAmount}
              onChange={e => {
                setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))
                setSelectedRate(null)
                setTxStatus(null)
              }}
            />
            <button
              className='ssw-token-btn'
              onClick={() => setTokenModalType('sell')}
              type='button'
            >
              {sellAsset.icon ? (
                <img src={sellAsset.icon} alt={sellAsset.symbol} className='ssw-token-icon' />
              ) : (
                <div className='ssw-token-icon-placeholder'>{sellAsset.symbol.charAt(0)}</div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{sellAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {sellChainInfo?.name ?? sellAsset.networkName ?? sellAsset.name}
                </span>
              </div>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>

          <div className='ssw-section-footer'>
            <span className='ssw-usd-value'>{sellUsdValue}</span>
            {(walletAddress || bitcoinAddress || solanaAddress) &&
              (isSellBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : sellAssetBalance ? (
                <span className='ssw-balance'>Balance: {sellAssetBalance.balanceFormatted}</span>
              ) : null)}
          </div>
        </div>

        <div className='ssw-swap-divider'>
          <button className='ssw-swap-btn' onClick={handleSwapTokens} type='button'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M12 5v14M5 12l7 7 7-7' />
            </svg>
          </button>
        </div>

        <div className='ssw-token-section ssw-buy'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Buy</span>
            {defaultReceiveAddress ? (
              <span className='ssw-receive-address-btn ssw-receive-address-readonly'>
                <span className='ssw-receive-address-text'>
                  {truncateAddress(defaultReceiveAddress, 4)}
                </span>
              </span>
            ) : (
              <button
                className={`ssw-receive-address-btn ${isCustomAddress ? 'ssw-custom' : ''}`}
                onClick={() => setIsAddressModalOpen(true)}
                type='button'
              >
                <span className='ssw-receive-address-text'>
                  {effectiveReceiveAddress
                    ? truncateAddress(effectiveReceiveAddress, 4)
                    : 'Enter address'}
                </span>
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                  <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                </svg>
              </button>
            )}
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={buyAmount ? formatAmount(buyAmount, buyAsset.precision) : ''}
              readOnly
            />
            <button
              className='ssw-token-btn'
              onClick={() => setTokenModalType('buy')}
              type='button'
            >
              {buyAsset.icon ? (
                <img src={buyAsset.icon} alt={buyAsset.symbol} className='ssw-token-icon' />
              ) : (
                <div className='ssw-token-icon-placeholder'>{buyAsset.symbol.charAt(0)}</div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{buyAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {buyChainInfo?.name ?? buyAsset.networkName ?? buyAsset.name}
                </span>
              </div>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>

          <div className='ssw-section-footer'>
            <span className='ssw-usd-value'>{buyUsdValue}</span>
            {(walletAddress || bitcoinAddress || solanaAddress) &&
              (isBuyBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : buyAssetBalance ? (
                <span className='ssw-balance'>Balance: {buyAssetBalance.balanceFormatted}</span>
              ) : null)}
          </div>
        </div>
      </div>

      {sellAmountBaseUnit && sellAmountBaseUnit !== '0' && (rates?.length || isLoadingRates) && (
        <div className='ssw-quotes'>
          <QuoteSelector
            rates={rates ?? []}
            selectedRate={selectedRate}
            onSelectRate={setSelectedRate}
            buyAsset={buyAsset}
            sellAsset={sellAsset}
            sellAmountBaseUnit={sellAmountBaseUnit}
            isLoading={isLoadingRates}
            buyAssetUsdPrice={buyAssetUsdPrice}
          />
        </div>
      )}

      <button
        className={`ssw-action-btn ${!canExecuteDirectly ? 'ssw-secondary' : ''}`}
        disabled={isButtonDisabled}
        onClick={handleButtonClick}
        type='button'
      >
        {buttonText}
      </button>

      {txStatus && (
        <div className={`ssw-tx-status ssw-tx-status-${txStatus.status}`}>
          <div className='ssw-tx-status-icon'>
            {txStatus.status === 'pending' && (
              <svg
                className='ssw-spinner'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' opacity='0.25' />
                <path d='M12 2a10 10 0 0 1 10 10' />
              </svg>
            )}
            {txStatus.status === 'success' && (
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M20 6L9 17l-5-5' />
              </svg>
            )}
            {txStatus.status === 'error' && (
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' />
                <path d='M15 9l-6 6M9 9l6 6' />
              </svg>
            )}
          </div>
          <div className='ssw-tx-status-content'>
            <span className='ssw-tx-status-message'>{txStatus.message}</span>
            {txStatus.txHash && (
              <a
                href={(() => {
                  if (isSellAssetUtxo) {
                    return `https://mempool.space/tx/${txStatus.txHash}`
                  }
                  if (isSellAssetSolana) {
                    return `https://solscan.io/tx/${txStatus.txHash}`
                  }
                  return `${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${
                    txStatus.txHash
                  }`
                })()}
                target='_blank'
                rel='noopener noreferrer'
                className='ssw-tx-status-link'
              >
                View transaction
              </a>
            )}
          </div>
          <button className='ssw-tx-status-close' onClick={() => setTxStatus(null)} type='button'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>
      )}

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
        currentAssetIds={[sellAsset.assetId, buyAsset.assetId]}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={slippage}
        onSlippageChange={setSlippage}
      />

      <AddressInputModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        chainId={buyAsset.chainId}
        chainName={buyChainInfo?.name ?? buyAsset.networkName ?? buyAsset.name}
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
    () =>
      createApiClient({
        baseUrl: props.apiBaseUrl,
        affiliateAddress: props.affiliateAddress,
      }),
    [props.apiBaseUrl, props.affiliateAddress],
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
    () =>
      createApiClient({
        baseUrl: props.apiBaseUrl,
        affiliateAddress: props.affiliateAddress,
      }),
    [props.apiBaseUrl, props.affiliateAddress],
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
