import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { SwapperManager, ZrxSwapper } from '@shapeshiftoss/swapper'
import {
  Asset,
  chainAdapters,
  ChainTypes,
  ExecQuoteOutput,
  Quote,
  SwapperType
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

export const useSwapper = () => {
  const { setValue, setError, clearErrors, getValues } = useFormContext()
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
    let result
    try {
      const swapper = swapperManager.getSwapper(bestSwapperType)
      result = await swapper?.buildQuoteTx({
        input: {
          sellAmount: toBaseUnit(amount, sellAsset.precision),
          sellAsset,
          buyAsset,
          sellAssetAccountId: '0', // TODO: remove hard coded accountId
          buyAssetAccountId: '0', // TODO: remove hard coded accountId
          slippage: trade?.slippage?.toString(),
          priceImpact: quote?.priceImpact,
          sendMax: false // TODO: implement sendMax
        },
        wallet
      })
    } catch (err) {
      console.error(`TradeProvider - buildTransaction error: ${err}`)
    }
    if (result?.success) {
      setFees(result, sellAsset)
      setValue('quote', result)
    } else {
      // TODO: (ryankk) fix errors to reflect correct trade attribute
      setError('useSwapper', { message: TRADE_ERRORS.INSUFFICIENT_FUNDS })
    }
    return result
  }

  const executeQuote = async ({
    wallet
  }: {
    wallet: HDWallet
  }): Promise<ExecQuoteOutput | undefined> => {
    let result
    try {
      const swapper = swapperManager.getSwapper(bestSwapperType)
      result = await swapper.executeQuote({ quote, wallet })
    } catch (err) {
      setError('useSwapper', { message: TRADE_ERRORS.NO_LIQUIDITY })
      console.error(`TradeProvider - executeQuote error: ${err}`) // eslint-disable-line no-console
    }
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
            try {
              const minMax = await swapper.getMinMax(quoteInput)
              const minMaxTrade = { ...minMax, ...trade }
              minMax && setValue('trade', minMaxTrade)
            } catch (err) {
              console.error(`getQuoteFromSwapper:getMinMax - ${err}`)
              setValue('trade', { minimum: '0', maximum: '0', minimumPrice: '0', ...trade })
            }
          }
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
        } catch (err: any) {
          const message = err?.statusReason
          if (message) setError('useSwapper', { message: TRADE_ERRORS.NO_LIQUIDITY })
          else setError('useSwapper', { message: TRADE_ERRORS.QUOTE_FAILED })
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
        const buyAmount = fromBaseUnit(bnOrZero(quote.buyAmount), buyAsset.currency.precision)
        const sellAmount = fromBaseUnit(bnOrZero(quote.sellAmount), sellAsset.currency.precision)
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
    reset
  }
}
