import { AssetService } from '@shapeshiftoss/asset-service'
import { CHAIN_NAMESPACE, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { bitcoin, ethereum, UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { UtxoAccountType } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'
import dotenv from 'dotenv'
import readline from 'readline-sync'
import Web3 from 'web3'

import { UtxoSupportedChainIds } from '.'
import { getAdapterManager } from './adapters'
import { SwapperManager } from './manager'
import { ThorchainSwapper, ThorchainSwapperDeps, ZrxSwapper } from './swappers'
import { fromBaseUnit } from './swappers/utils/bignumber'

dotenv.config()

const {
  ETH_NODE_URL = 'http://localhost:3000',
  MIDGARD_URL = 'https://dev-indexer.thorchain.shapeshift.com/v2',
  DEVICE_ID = 'device123',
  MNEMONIC = 'all all all all all all all all all all all all',
} = process.env

const toBaseUnit = (amount: BigNumber | string, precision: number): string => {
  return new BigNumber(amount)
    .multipliedBy(new BigNumber(10).exponentiatedBy(new BigNumber(precision)))
    .toString()
}

const getWallet = async (): Promise<NativeHDWallet> => {
  if (!MNEMONIC) {
    throw new Error('Cannot init native wallet without mnemonic')
  }
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: MNEMONIC,
    deviceId: DEVICE_ID,
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const main = async (): Promise<void> => {
  const [, , ...args] = process.argv
  const [sellSymbol, buySymbol, sellAmountBeforeFeesCryptoPrecision] = args

  console.info(`sell ${sellAmountBeforeFeesCryptoPrecision} of ${sellSymbol} to ${buySymbol}`)

  if (!sellAmountBeforeFeesCryptoPrecision || !sellSymbol || !buySymbol) {
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

  const adapterManager = getAdapterManager()
  const ethAdapter = adapterManager.get(ethChainId) as unknown as ethereum.ChainAdapter
  if (!ethAdapter) {
    throw new Error('no ethAdapter')
  }

  const sellAdapter = adapterManager.get(sellAsset.chainId)
  if (!sellAdapter) {
    throw new Error(`no sellAdapter ${sellAsset.chainId}`)
  }

  const buyAdapter = adapterManager.get(buyAsset.chainId)
  if (!buyAdapter) {
    throw new Error(`no buyAdapter ${buyAsset.chainId}`)
  }

  // Swapper Deps
  const wallet = await getWallet()

  const web3Provider = new Web3.providers.HttpProvider(ETH_NODE_URL)
  const web3 = new Web3(web3Provider)
  const zrxSwapperDeps = {
    wallet,
    adapter: ethAdapter,
    web3,
  }
  const swapManager = new SwapperManager()
  const zrxSwapper = new ZrxSwapper(zrxSwapperDeps)
  swapManager.addSwapper(zrxSwapper)

  const tcDeps: ThorchainSwapperDeps = {
    midgardUrl: MIDGARD_URL,
    daemonUrl: '',
    web3,
    adapterManager,
  }
  const tc = new ThorchainSwapper(tcDeps)
  await tc.initialize()
  swapManager.addSwapper(tc)

  const swapper = await swapManager.getBestSwapper({
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
  })

  console.info(`using swapper ${swapper?.getType()}`)
  if (!swapper) {
    console.warn(`no swapper found for specified assets`)
    return
  }

  if (sellAdapter == undefined || sellAdapter == null) {
    throw new Error('huh')
  }

  let utxoAccountType: UtxoAccountType | undefined
  if (sellAdapter.getSupportedAccountTypes) {
    utxoAccountType = bitcoin.ChainAdapter.defaultUtxoAccountType
  }

  const bip44Params = sellAdapter.getBIP44Params({
    accountNumber: 0,
    accountType: utxoAccountType,
  })
  if (!bip44Params) {
    throw new Error('falsy bip44Params')
  }

  const { chainNamespace: sellChainNamespace } = fromAssetId(sellAsset.assetId)
  switch (sellChainNamespace) {
    case CHAIN_NAMESPACE.Evm:
    case CHAIN_NAMESPACE.Utxo:
    case CHAIN_NAMESPACE.CosmosSdk:
  }
  let publicKey
  if (sellChainNamespace == CHAIN_NAMESPACE.Utxo) {
    if (!utxoAccountType) {
      throw new Error('utxoAccountType must be defined')
    }
    publicKey = await (sellAdapter as unknown as UtxoBaseAdapter<UtxoChainId>).getPublicKey(
      wallet,
      bip44Params,
      utxoAccountType,
    )
  }
  const sellAmountBeforeFeesCryptoBaseUnit = toBaseUnit(
    sellAmountBeforeFeesCryptoPrecision,
    sellAsset.precision,
  )
  const buyAssetReceiveAddr = await buyAdapter.getAddress({
    wallet,
    accountType: utxoAccountType,
    bip44Params,
  })
  console.info(`${buyAsset.name} using receive addr ${buyAssetReceiveAddr}`)
  let quote
  try {
    quote = await swapper.getTradeQuote({
      chainId: sellAsset.chainId as UtxoSupportedChainIds,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      sendMax: false,
      accountType: utxoAccountType || bitcoin.ChainAdapter.defaultUtxoAccountType,
      bip44Params,
      xpub: publicKey?.xpub || '',
      receiveAddress: buyAssetReceiveAddr,
    })
  } catch (e) {
    console.error(e)
    return
  }

  if (!quote) {
    console.warn('no quote returned')
    return
  }

  const buyAmountCryptoPrecision = fromBaseUnit(
    quote.buyAmountCryptoBaseUnit || '0',
    buyAsset.precision,
  )
  const answer = readline.question(
    `Swap ${sellAmountBeforeFeesCryptoPrecision} ${
      sellAsset.symbol
    } for ${buyAmountCryptoPrecision} ${buyAsset.symbol} on ${swapper.getType()}? (y/n): `,
  )
  if (answer === 'y') {
    const trade = await swapper.buildTrade({
      chainId: sellAsset.chainId as UtxoChainId,
      wallet,
      buyAsset,
      sendMax: false,
      sellAmountBeforeFeesCryptoBaseUnit,
      sellAsset,
      receiveAddress: buyAssetReceiveAddr,
      accountType: utxoAccountType || bitcoin.ChainAdapter.defaultUtxoAccountType,
      bip44Params,
      xpub: publicKey?.xpub || '',
    })

    const tradeResult = await swapper.executeTrade({ trade, wallet })
    console.info('broadcast tx with id: ', tradeResult.tradeId)
  }
}

main().then(() => console.info('Done'))
