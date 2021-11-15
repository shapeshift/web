import { useTranslate } from 'react-polyglot'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import {
  Asset,
  chainAdapters,
  ChainTypes,
  ExecQuoteOutput,
  Quote,
  SwapperType,
  MinMaxOutput
} from '@shapeshiftoss/types'
import debounce from 'lodash/debounce'
import { useCallback, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TradeAsset, TradeState } from 'components/Trade/Trade'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useIsComponentMounted } from 'hooks/useIsComponentMounted/useIsComponentMounted'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getWeb3Instance } from 'lib/web3-instance'

const debounceTime = 1000

export enum TradeActions {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT'
}

type GetQuoteInput = {
  amount: string
  action?: TradeActions
}

interface GetQuoteFromSwapper<C extends ChainTypes, S extends SwapperType> extends GetQuoteInput {
  sellAsset: Asset
  buyAsset: Asset
  onFinish: (quote: Quote<C, S>) => void
}

export enum TRADE_ERRORS {
  NOT_ENOUGH_ETH = 'trade.errors.notEnoughEth',
  AMOUNT_TO_SMALL = 'trade.errors.amountToSmall',
  NEGATIVE_MAX = 'trade.errors.negativeMax',
  INVALID_MAX = 'trade.errors.invalidMax',
  INSUFFICIENT_FUNDS = 'trade.errors.insufficientFunds',
  INSUFFICIENT_FUNDS_FOR_LIMIT = 'trade.errors.insufficientFundsForLimit',
  INSUFFICIENT_FUNDS_FOR_AMOUNT = 'trade.errors.insufficientFundsForAmount',
  NO_LIQUIDITY = 'trade.errors.noLiquidityError',
  BALANCE_TO_LOW = 'trade.errors.balanceToLow',
  DEX_TRADE_FAILED = 'trade.errors.dexTradeFailed',
  QUOTE_FAILED = 'trade.errors.quoteFailed',
  OVER_SLIP_SCORE = 'trade.errors.overSlipScore'
}

// TODO: (ryankk) revisit the logic inside useSwapper post bounty to see
// if it makes sense to move some of it down to lib.
export const useSwapper = () => {
  // TODO: check to see if it makes sense to set errors
  const { setValue, setError, clearErrors, getValues } = useFormContext()
  const translate = useTranslate()
  const isComponentMounted = useIsComponentMounted()
  const [quote, trade] = useWatch({
    name: ['quote', 'trade']
  })
  const adapterManager = useChainAdapters()
  const [swapperManager] = useState<SwapperManager>(() => {
    const manager = new SwapperManager()
    const web3 = getWeb3Instance()
    manager.addSwapper(SwapperType.Zrx, new ZrxSwapper({ web3, adapterManager }))
    return manager
  })
  const [bestSwapperType, setBestSwapperType] = useState(SwapperType.Zrx)
  const [debounceObj, setDebounceObj] = useState<{ cancel: () => void }>()

  const getDefaultPair = useCallback(() => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    return swapper.getDefaultPair()
  }, [swapperManager, bestSwapperType])

  const getSendMaxAmount = async ({
    wallet,
    sellAsset,
    buyAsset
  }: {
    wallet: HDWallet
    sellAsset: TradeAsset
    buyAsset: TradeAsset
  }) => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    const { minimum: minimumAmount } = await swapper?.getMinMax({
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency
    })

    const minimumQuote = await swapper?.buildQuoteTx({
      input: {
        sellAsset: sellAsset.currency,
        buyAsset: buyAsset.currency,
        sellAmount: toBaseUnit(minimumAmount, sellAsset.currency.precision),
        sellAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
        buyAssetAccountId: '0' // TODO: remove hard coded accountId when multiple accounts are implemented
      },
      wallet
    })

    if (!minimumQuote) return

    const sendMaxAmount = await swapper.getSendMaxAmount({
      wallet,
      quote: minimumQuote,
      sellAssetAccountId: '0' // TODO: remove hard coded accountId when multiple accounts are implemented
    })

    const formattedMaxAmount = fromBaseUnit(sendMaxAmount, sellAsset.currency.precision)

    // Set form amount value to updated max value
    setValue('sellAsset.amount', formattedMaxAmount)
    setValue('action', TradeActions.SELL)

    return formattedMaxAmount
  }

  const buildQuoteTx = async ({
    wallet,
    sellAsset,
    buyAsset,
    amount
  }: {
    wallet: HDWallet
    sellAsset: Asset
    buyAsset: Asset
    amount: string
  }): Promise<Quote<ChainTypes, SwapperType> | undefined> => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    const { minimum } = await swapper.getMinMax({
      sellAsset,
      buyAsset
    })
    const sellAmount = toBaseUnit(amount, sellAsset.precision)
    const minSellAmount = toBaseUnit(minimum, sellAsset.precision)

    if (bnOrZero(sellAmount).lt(minSellAmount)) {
      return {
        success: false,
        sellAsset,
        buyAsset,
        statusReason: translate(TRADE_ERRORS.AMOUNT_TO_SMALL, { minLimit: minimum })
      }
    }

    const result = await swapper?.buildQuoteTx({
      input: {
        sellAmount,
        sellAsset,
        buyAsset,
        sellAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
        buyAssetAccountId: '0', // TODO: remove hard coded accountId when multiple accounts are implemented
        slippage: trade?.slippage?.toString(),
        priceImpact: quote?.priceImpact
      },
      wallet
    })

    if (result?.success) {
      setFees(result, sellAsset)
      setValue('quote', result)
      return result
    } else {
      // TODO: (ryankk) Post bounty, these need to be revisited so the error messages can be more accurate.
      switch (result.statusReason) {
        case 'Gas estimation failed':
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.INSUFFICIENT_FUNDS)
          }
        case 'Insufficient funds for transaction':
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.INSUFFICIENT_FUNDS_FOR_AMOUNT, {
              symbol: sellAsset.symbol
            })
          }
        default:
          return {
            success: false,
            sellAsset,
            buyAsset,
            statusReason: translate(TRADE_ERRORS.QUOTE_FAILED)
          }
      }
    }
  }

  const executeQuote = async ({
    wallet
  }: {
    wallet: HDWallet
  }): Promise<ExecQuoteOutput | undefined> => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    const result = await swapper.executeQuote({ quote, wallet })
    return result
  }

  const getQuoteFromSwapper = async <C extends ChainTypes, S extends SwapperType>({
    amount,
    sellAsset,
    buyAsset,
    action,
    onFinish
  }: GetQuoteFromSwapper<C, S>) => {
    if (debounceObj?.cancel) debounceObj.cancel()
    clearErrors()
    const quoteDebounce = debounce(async () => {
      if (isComponentMounted.current) {
        try {
          const swapper = swapperManager.getSwapper(bestSwapperType)
          let convertedAmount =
            action === TradeActions.BUY ? { buyAmount: amount } : { sellAmount: amount }

          if (action === TradeActions.FIAT) {
            const rate = bn(
              await swapper.getUsdRate({
                symbol: sellAsset.symbol,
                tokenId: sellAsset.tokenId
              })
            )
            convertedAmount = {
              sellAmount: rate.gt(0)
                ? toBaseUnit(bn(amount).div(rate).toString(), sellAsset.precision).toString()
                : '0'
            }
          }
          const quoteInput = {
            sellAsset: sellAsset,
            buyAsset: buyAsset,
            ...convertedAmount
          }

          const { trade } = getValues()
          let minMax = trade
          if (
            quote?.sellAsset?.symbol !== sellAsset.symbol &&
            quote?.buyAsset?.symbol !== buyAsset.symbol
          ) {
            const minMax = await swapper.getMinMax(quoteInput)
            const minMaxTrade = { ...minMax, ...trade }
            minMax && setValue('trade', minMaxTrade)
          }

          if (!(minMax.minimum && minMax.maximum)) return

          const newQuote = await swapper.getQuote({ ...quoteInput, ...minMax })
          if (!(newQuote && newQuote.success)) throw newQuote

          const sellAssetUsdRate = bnOrZero(
            await swapper.getUsdRate({
              symbol: sellAsset.symbol,
              tokenId: sellAsset.tokenId
            })
          )
          const newQuoteRate = bnOrZero(newQuote.rate)
          const buyAssetUsdRate = newQuoteRate.gt(0)
            ? sellAssetUsdRate.div(newQuoteRate).toString()
            : bnOrZero(
                await swapper.getUsdRate({
                  symbol: buyAsset.symbol,
                  tokenId: buyAsset.tokenId
                })
              )
          // TODO: Implement fiatPerUsd here
          setFees(newQuote, sellAsset)
          setValue('quote', newQuote)
          setValue('sellAsset.fiatRate', sellAssetUsdRate.toString())
          setValue('buyAsset.fiatRate', buyAssetUsdRate.toString())
          if (action) onFinish(newQuote)
        } catch (e) {
          console.error(e)
        }
      }
    }, debounceTime)
    quoteDebounce()
    setDebounceObj({ ...quoteDebounce })
  }

  const getQuote = async ({
    amount,
    sellAsset,
    buyAsset,
    action
  }: GetQuoteInput & { sellAsset: TradeAsset; buyAsset: TradeAsset }) => {
    if (!buyAsset?.currency || !sellAsset?.currency) return

    const isSellAmount = action === TradeActions.SELL || !amount
    const isBuyAmount = action === TradeActions.BUY && !!amount
    const isFiatAmount = action === TradeActions.FIAT

    let formattedAmount = amount
    const precision = isSellAmount
      ? sellAsset.currency.precision
      : isBuyAmount && buyAsset.currency.precision
    if (precision) {
      formattedAmount = toBaseUnit(amount, precision)
    }

    const onFinish = (quote: Quote<ChainTypes, SwapperType>) => {
      if (isComponentMounted.current) {
        const { sellAsset, buyAsset, action, fiatAmount } = getValues()

        if (!(quote.buyAmount && quote.sellAmount)) return

        const buyAmount = fromBaseUnit(quote.buyAmount, buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(quote.sellAmount, sellAsset.currency.precision)
        const newFiatAmount = bn(buyAmount).times(bnOrZero(buyAsset.fiatRate)).toFixed(2)

        if (action === TradeActions.SELL && isSellAmount && amount === sellAsset.amount) {
          setValue('buyAsset.amount', buyAmount)
          setValue('fiatAmount', newFiatAmount)
          setValue('action', undefined)
        } else if (action === TradeActions.BUY && isBuyAmount && amount === buyAsset.amount) {
          setValue('sellAsset.amount', sellAmount)
          setValue('fiatAmount', newFiatAmount)
          setValue('action', undefined)
        } else if (action === TradeActions.FIAT && isFiatAmount && amount === fiatAmount) {
          setValue('buyAsset.amount', buyAmount)
          setValue('sellAsset.amount', sellAmount)
          setValue('action', undefined)
        }
      }
    }

    await getQuoteFromSwapper<typeof sellAsset.currency.chain, typeof bestSwapperType>({
      amount: formattedAmount,
      sellAsset: sellAsset.currency,
      buyAsset: buyAsset.currency,
      action,
      onFinish
    })
  }

  const getFiatRate = async ({
    symbol,
    tokenId
  }: {
    symbol: string
    tokenId?: string
  }): Promise<string> => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    return swapper?.getUsdRate({
      symbol,
      tokenId
    })
  }

  const setFees = async (result: Quote<ChainTypes, SwapperType>, sellAsset: Asset) => {
    const feePrecision = sellAsset.chain === ChainTypes.Ethereum ? 18 : sellAsset.precision
    const feeBN = bnOrZero(result?.feeData?.fee).dividedBy(bn(10).exponentiatedBy(feePrecision))
    const fee = feeBN.toString()

    switch (sellAsset.chain) {
      case ChainTypes.Ethereum: {
        const ethResult = result as Quote<ChainTypes.Ethereum, SwapperType.Zrx>
        const approvalFee = ethResult?.feeData?.chainSpecific?.approvalFee
          ? bn(ethResult.feeData.chainSpecific.approvalFee)
              .dividedBy(bn(10).exponentiatedBy(18))
              .toString()
          : '0'
        const totalFee = feeBN.plus(approvalFee).toString()
        const gasPrice = bnOrZero(ethResult?.feeData?.chainSpecific.gasPrice).toString()
        const estimatedGas = bnOrZero(ethResult?.feeData?.chainSpecific.estimatedGas).toString()

        if (isThorchainQuote(result)) {
          const receiveFee = result?.feeData?.swapperSpecific.receiveFee ?? '0'
          const fees: chainAdapters.QuoteFeeData<ChainTypes.Ethereum, SwapperType.Thorchain> = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee
            },
            swapperSpecific: {
              receiveFee
            }
          }
          setValue('fees', fees)
        } else {
          const fees: chainAdapters.QuoteFeeData<ChainTypes.Ethereum, SwapperType.Zrx> = {
            fee,
            chainSpecific: {
              approvalFee,
              gasPrice,
              estimatedGas,
              totalFee
            }
          }
          setValue('fees', fees)
        }
        break
      }
      default:
        throw new Error('Unsupported chain ' + sellAsset.chain)
    }
  }

  function isThorchainQuote(
    result: Quote<ChainTypes, SwapperType>
  ): result is Quote<ChainTypes, SwapperType.Thorchain> {
    return (
      (result as Quote<ChainTypes, SwapperType.Thorchain>)?.feeData?.swapperSpecific !== undefined
    )
  }

  const getBestSwapper = useCallback(
    async ({
      sellAsset,
      buyAsset
    }: Pick<TradeState<ChainTypes, SwapperType>, 'sellAsset' | 'buyAsset'>) => {
      if (!sellAsset.currency || !buyAsset.currency) return
      const input = {
        sellAsset: sellAsset.currency,
        buyAsset: buyAsset.currency
      }
      const bestSwapperType = await swapperManager.getBestSwapper(input)
      setBestSwapperType(bestSwapperType)
      setValue('trade', { ...trade, name: bestSwapperType })
    },
    [swapperManager, trade, setBestSwapperType, setValue]
  )

  const checkApprovalNeeded = async (wallet: HDWallet | NativeHDWallet): Promise<boolean> => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    const { approvalNeeded } = await swapper.approvalNeeded({ quote, wallet })
    return approvalNeeded
  }

  const approveInfinite = async (wallet: HDWallet | NativeHDWallet): Promise<string> => {
    const swapper = swapperManager.getSwapper(bestSwapperType)
    const txid = await swapper.approveInfinite({ quote, wallet })
    return txid
  }

  const reset = () => {
    setValue('buyAsset.amount', '')
    setValue('sellAsset.amount', '')
    setValue('fiatAmount', '')
    setValue('action', undefined)
  }

  return {
    swapperManager,
    getQuote,
    buildQuoteTx,
    executeQuote,
    getBestSwapper,
    getDefaultPair,
    checkApprovalNeeded,
    approveInfinite,
    getFiatRate,
    getSendMaxAmount,
    reset
  }
}
