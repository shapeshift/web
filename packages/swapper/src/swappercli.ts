import { AssetService } from '@shapeshiftoss/asset-service'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { ChainTypes } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import dotenv from 'dotenv'
import readline from 'readline-sync'
import Web3 from 'web3'

import { SwapperType } from './api'
import { SwapperManager } from './manager/SwapperManager'
import { ThorchainSwapper } from './swappers/thorchain/ThorchainSwapper'
import { ZrxSwapper } from './swappers/zrx/ZrxSwapper'
dotenv.config()

const {
  UNCHAINED_HTTP_API = 'http://localhost:31300',
  UNCHAINED_WS_API = 'wss://localhost:31300',
  ETH_NODE_URL = 'http://localhost:3000',
  DEVICE_ID = 'device123',
  MNEMONIC = 'all all all all all all all all all all all all'
} = process.env

const toBaseUnit = (amount: BigNumber | string, precision: number): string => {
  return new BigNumber(amount)
    .multipliedBy(new BigNumber(10).exponentiatedBy(new BigNumber(precision)))
    .toString()
}

const fromBaseUnit = (amount: BigNumber | string, precision: number): string => {
  return new BigNumber(amount).times(new BigNumber(10).exponentiatedBy(precision * -1)).toString()
}

const getWallet = async (): Promise<NativeHDWallet> => {
  if (!MNEMONIC) {
    throw new Error('Cannot init native wallet without mnemonic')
  }
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: MNEMONIC,
    deviceId: DEVICE_ID
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const main = async (): Promise<void> => {
  const [, , ...args] = process.argv
  const [sellSymbol, buySymbol, sellAmount] = args

  console.info(`sellSymbol: sell ${sellAmount} of ${sellSymbol} to ${buySymbol}`)

  if (!sellAmount || !sellSymbol || !buySymbol) {
    console.error(`
      Usage:
      swapcli [sellSymbol] [buySymbol] [sellAmount](denominated in sell asset, not wei)
    `)
    return
  }

  const assetService = new AssetService()
  const assetMap = assetService.getAll()

  const sellAsset = assetMap[sellSymbol]
  const buyAsset = assetMap[buySymbol]

  if (!sellAsset) {
    console.error(`No asset ${sellSymbol} found in asset service`)
    return
  }
  if (!buyAsset) {
    console.error(`No asset ${buySymbol} found in asset service`)
    return
  }

  // Swapper Deps
  const wallet = await getWallet()
  const unchainedUrls = {
    [ChainTypes.Ethereum]: {
      httpUrl: UNCHAINED_HTTP_API,
      wsUrl: UNCHAINED_WS_API
    }
  }
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const web3Provider = new Web3.providers.HttpProvider(ETH_NODE_URL)
  const web3 = new Web3(web3Provider)

  const zrxSwapperDeps = { wallet, adapterManager, web3 }
  const thorchainSwapperDeps = {
    midgardUrl: 'https://midgard.thorchain.info/v2',
    adapterManager: <ChainAdapterManager>{}
  }

  const manager = new SwapperManager()
  const zrxSwapper = new ZrxSwapper(zrxSwapperDeps)
  const thorchainSwapper = new ThorchainSwapper(thorchainSwapperDeps)
  await thorchainSwapper.initialize()
  manager.addSwapper(SwapperType.Zrx, zrxSwapper)
  manager.addSwapper(SwapperType.Thorchain, thorchainSwapper)
  const swapper = await manager.getBestSwapper({
    sellAssetId: 'eip155:1/slip44:60',
    buyAssetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
  })

  if (!swapper) return
  const sellAmountBase = toBaseUnit(sellAmount, sellAsset.precision)

  let quote
  try {
    quote = await swapper.getTradeQuote({
      sellAsset,
      buyAsset,
      sellAmount: sellAmountBase,
      sellAssetAccountId: '0',
      sendMax: false
    })
  } catch (e) {
    console.error(e)
  }

  if (!quote) {
    return
  }

  console.info('quote = ', JSON.stringify(quote))

  const buyAmount = fromBaseUnit(quote.buyAmount || '0', buyAsset.precision)

  const answer = readline.question(
    `Swap ${sellAmount} ${sellAsset.symbol} for ${buyAmount} ${
      buyAsset.symbol
    } on ${swapper.getType()}? (y/n): `
  )
  if (answer === 'y') {
    const trade = await swapper.buildTrade({
      wallet,
      buyAsset,
      sendMax: false,
      sellAmount: sellAmountBase,
      sellAsset,
      sellAssetAccountId: '0',
      buyAssetAccountId: '0'
    })
    const txid = await swapper.executeTrade({ trade, wallet })
    console.info('broadcast tx with id: ', txid)
  }
}

main().then(() => console.info('Done'))
