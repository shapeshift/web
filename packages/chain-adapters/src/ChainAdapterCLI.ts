import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP32Params, ChainTypes } from '@shapeshiftoss/types'
import dotenv from 'dotenv'

import { ChainAdapterManager } from './ChainAdapterManager'

dotenv.config()

const foxContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'

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
  }
}

const main = async () => {
  try {
    const chainAdapterManager = new ChainAdapterManager(unchainedUrls)
    const wallet = await getWallet()

    /** BITCOIN CLI */
    const btcChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
    const btcBip32Params: BIP32Params = {
      purpose: 84,
      coinType: 0,
      accountNumber: 0,
      isChange: false,
      index: 10
    }

    const btcAddress = await btcChainAdapter.getAddress({
      wallet,
      bip32Params: btcBip32Params,
      scriptType: BTCInputScriptType.SpendWitness
    })
    console.log('btcAddress:', btcAddress)

    const btcAccount = await btcChainAdapter.getAccount(btcAddress)
    console.log('btcAccount:', btcAccount)

    await btcChainAdapter.subscribeTxs(
      { wallet, bip32Params: btcBip32Params, scriptType: BTCInputScriptType.SpendWitness },
      (msg) => console.log(msg),
      (err) => console.log(err)
    )

    const txInput = {
      to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
      value: '400',
      wallet,
      bip32Params: btcBip32Params,
      chainSpecific: { scriptType: BTCInputScriptType.SpendAddress, satoshiPerByte: '4' }
    }

    try {
      const btcUnsignedTx = await btcChainAdapter.buildSendTransaction(txInput)
      const btcSignedTx = await btcChainAdapter.signTransaction({
        wallet,
        txToSign: btcUnsignedTx.txToSign
      })
      console.log('btcSignedTx:', btcSignedTx)
    } catch (err) {
      console.log('btcTx error:', err.message)
    }

    // const btcTxID = await btcChainAdapter.broadcastTransaction(btcSignedTx)
    // console.log('btcTxID: ', txid)

    /** ETHEREUM CLI */
    const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
    const ethBip32Params: BIP32Params = { purpose: 44, coinType: 60, accountNumber: 0 }

    const ethAddress = await ethChainAdapter.getAddress({ wallet, bip32Params: ethBip32Params })
    console.log('ethAddress:', ethAddress)

    const ethAccount = await ethChainAdapter.getAccount(ethAddress)
    console.log('ethAccount:', ethAccount)

    await ethChainAdapter.subscribeTxs(
      { wallet, bip32Params: ethBip32Params },
      (msg) => console.log(msg),
      (err) => console.log(err)
    )

    // send eth example
    try {
      const ethUnsignedTx = await ethChainAdapter.buildSendTransaction({
        to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
        value: '1',
        wallet,
        bip32Params: ethBip32Params,
        chainSpecific: { fee: '0', gasLimit: '0' }
      })
      const ethSignedTx = await ethChainAdapter.signTransaction({
        wallet,
        txToSign: ethUnsignedTx.txToSign
      })
      console.log('ethSignedTx:', ethSignedTx)
    } catch (err) {
      console.log('ethTx error:', err.message)
    }

    // const ethTxID = await ethChainAdapter.broadcastTransaction(ethSignedTx)
    // console.log('ethTxID:', ethTxID)

    // send fox example (erc20)
    try {
      const erc20UnsignedTx = await ethChainAdapter.buildSendTransaction({
        to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
        value: '1',
        wallet,
        bip32Params: ethBip32Params,
        chainSpecific: { fee: '0', gasLimit: '0', erc20ContractAddress: foxContractAddress }
      })
      const erc20SignedTx = await ethChainAdapter.signTransaction({
        wallet,
        txToSign: erc20UnsignedTx.txToSign
      })
      console.log('erc20SignedTx:', erc20SignedTx)

      //const erc20TxID = await ethChainAdapter.broadcastTransaction(erc20SignedTx)
      //console.log('erc20TxID:', erc20TxID)
    } catch (err) {
      console.log('erc20Tx error:', err.message)
    }
  } catch (err) {
    console.error(err)
  }
}

main().then(() => console.log('DONE'))
