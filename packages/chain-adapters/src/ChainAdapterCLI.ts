/* eslint-disable @typescript-eslint/no-unused-vars */
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP44Params, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import dotenv from 'dotenv'

import { cosmossdk } from './'
import { ChainAdapterManager } from './ChainAdapterManager'

dotenv.config()

const getWallet = async (): Promise<NativeHDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: process.env.CLI_MNEMONIC,
    deviceId: 'test'
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const unchainedUrls = {
  [ChainTypes.Bitcoin]: {
    httpUrl: 'https://dev-api.bitcoin.shapeshift.com',
    wsUrl: 'wss://dev-api.bitcoin.shapeshift.com'
  },
  [ChainTypes.Ethereum]: {
    httpUrl: 'https://dev-api.ethereum.shapeshift.com',
    wsUrl: 'wss://dev-api.ethereum.shapeshift.com'
  },
  [ChainTypes.Cosmos]: {
    httpUrl: 'https://dev-api.cosmos.shapeshift.com',
    wsUrl: 'wss://dev-api.cosmos.shapeshift.com'
  }
}

// @ts-ignore:nextLine
const testBitcoin = async (
  chainAdapterManager: ChainAdapterManager,
  wallet: NativeHDWallet,
  broadcast = false
) => {
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
  const bip44Params: BIP44Params = {
    purpose: 84,
    coinType: 0,
    accountNumber: 0,
    isChange: false,
    index: 10
  }

  const address = await chainAdapter.getAddress({
    wallet,
    bip44Params,
    accountType: UtxoAccountType.SegwitNative
  })
  console.log('bitcoin: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('bitcoin: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('bitcoin: txHistory:', txHistory)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params, accountType: UtxoAccountType.SegwitNative },
    (msg) => console.log('bitcoin: tx:', msg),
    (err) => console.log(err)
  )

  try {
    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
      value: '400',
      wallet,
      bip44Params,
      chainSpecific: { accountType: UtxoAccountType.P2pkh, satoshiPerByte: '4' }
    })

    const signedTx = await chainAdapter.signTransaction({ wallet, txToSign: unsignedTx.txToSign })
    console.log('bitcoin: signedTx:', signedTx)

    if (broadcast) {
      const txid = await chainAdapter.broadcastTransaction(signedTx)
      console.log('bitcoin: txid: ', txid)
    }
  } catch (err) {
    console.log('bitcoin: tx error:', err.message)
  }
}

// @ts-ignore:nextLine
const testEthereum = async (
  chainAdapterManager: ChainAdapterManager,
  wallet: NativeHDWallet,
  broadcast = false
) => {
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const bip44Params: BIP44Params = { purpose: 44, coinType: 60, accountNumber: 0 }

  const address = await chainAdapter.getAddress({ wallet, bip44Params })
  console.log('ethereum: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('ethereum: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('ethereum: txHistory:', txHistory)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params },
    (msg) => console.log('ethereum: tx:', msg),
    (err) => console.log(err)
  )

  try {
    const feeData = await chainAdapter.getFeeData({
      to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
      value: '123',
      chainSpecific: {
        from: '0x0000000000000000000000000000000000000000',
        contractData: '0x'
      }
    })
    console.log('ethereum: feeData', feeData)
  } catch (err) {
    console.log('ethereum: feeData error:', err.message)
  }

  // send eth example
  try {
    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
      value: '1',
      wallet,
      bip44Params,
      chainSpecific: { gasPrice: '0', gasLimit: '0' }
    })

    //const unsignedTx = await chainAdapter.buildSendTransaction({
    //  to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
    //  value: '1',
    //  wallet,
    //  bip44Params,
    //  chainSpecific: {
    //    gasPrice: '0',
    //    gasLimit: '0',
    //    erc20ContractAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d' // FOX
    //  }
    //})

    const signedTx = await chainAdapter.signTransaction({
      wallet,
      txToSign: unsignedTx.txToSign
    })
    console.log('ethereum: signedTx:', signedTx)

    if (broadcast) {
      const txid = await chainAdapter.broadcastTransaction(signedTx)
      console.log('ethereum: txid:', txid)
    }
  } catch (err) {
    console.log('ethereum: tx error:', err.message)
  }
}

// @ts-ignore:nextLine
const testCosmos = async (
  chainAdapterManager: ChainAdapterManager,
  wallet: NativeHDWallet,
  broadcast = false
) => {
  const chainAdapter = chainAdapterManager.byChain(
    ChainTypes.Cosmos
  ) as cosmossdk.cosmos.ChainAdapter
  const bip44Params: BIP44Params = { purpose: 44, coinType: 118, accountNumber: 0 }

  const address = await chainAdapter.getAddress({ wallet, bip44Params })
  console.log('cosmos: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('cosmos: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('cosmos: txHistory:', txHistory)

  const shapeshiftValidator = await chainAdapter.getValidator(
    'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
  )
  console.log('cosmos: shapeshiftValidator:', shapeshiftValidator)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params },
    (msg) => console.log('cosmos: tx:', msg),
    (err) => console.log(err)
  )

  // send cosmos example
  try {
    const feeData = await chainAdapter.getFeeData({ sendMax: false })
    const fee = '10' // increase if taking too long
    const gas = feeData.slow.chainSpecific.gasLimit

    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner',
      value: '99000',
      wallet,
      bip44Params,
      chainSpecific: { gas, fee }
    })

    //const unsignedTx = await chainAdapter.buildClaimRewardsTransaction({
    //  validator: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf', // ShapeShift DAO validator
    //  wallet,
    //  bip44Params,
    //  chainSpecific: { gas, fee }
    //})

    //const unsignedTx = await chainAdapter.buildRedelegateTransaction({
    //  fromValidator: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf', // test validator
    //  toValidator: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf', // ShapeShift DAO validator
    //  value: '100000000000',
    //  wallet,
    //  bip44Params,
    //  chainSpecific: { gas, fee }
    //})

    console.log('cosmos: unsignedTx:', JSON.stringify(unsignedTx, null, 2))

    if (broadcast) {
      const txid = await chainAdapter.signAndBroadcastTransaction({
        wallet,
        txToSign: unsignedTx.txToSign
      })
      console.log('cosmos: txid:', txid)
    }
  } catch (err) {
    console.log('cosmos: tx error:', err.message)
  }
}

const main = async () => {
  try {
    const chainAdapterManager = new ChainAdapterManager(unchainedUrls)

    const wallet = await getWallet()

    await testBitcoin(chainAdapterManager, wallet)
    await testEthereum(chainAdapterManager, wallet)
    await testCosmos(chainAdapterManager, wallet)
  } catch (err) {
    console.error(err)
  }
}

main().then(() => console.log('DONE'))
