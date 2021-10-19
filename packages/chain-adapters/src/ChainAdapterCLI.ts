import { ChainAdapterManager } from './ChainAdapterManager'
import { BIP32Params, ChainTypes } from '@shapeshiftoss/types'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import dotenv from 'dotenv'
dotenv.config()

// const foxContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'

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
  [ChainTypes.Bitcoin]: 'http://api.bitcoin.shapeshift.com',
  [ChainTypes.Ethereum]: 'http://api.ethereum.shapeshift.com'
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
    console.log('btcAddress: ', btcAddress)

    const btcAccount = await btcChainAdapter.getAccount(btcAddress)
    console.log('btcAccount: ', btcAccount)

    //const txInput = {
    //  asset: { id: '123', symbol: 'BTC' },
    //  recipients: [{ address: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4', value: 400 }],
    //  wallet,
    //  opReturnData: 'sup fool',
    //  bip32Params: btcBip32Params,
    //  feeSpeed: ChainAdapters.FeeDataKey.Slow
    //}

    //const unsignedTx = await btcChainAdapter.buildSendTransaction(txInput)
    //const signedTx = await btcChainAdapter.signTransaction({
    //  wallet,
    //  txToSign: unsignedTx.txToSign
    //})
    //console.log('btcSignedTx: ', signedTx)

    // const txid = await btcChainAdapter.broadcastTransaction(signedTx)
    // console.log('txid: ', txid)

    /** ETHEREUM CLI */
    const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
    const ethBip32Params: BIP32Params = { purpose: 44, coinType: 60, accountNumber: 0 }
    const ethAddress = await ethChainAdapter.getAddress({ wallet, bip32Params: ethBip32Params })
    console.log('ethAddress:', ethAddress)
    const ethAccount = await ethChainAdapter.getAccount(ethAddress)
    console.log('ethAccount:', ethAccount)

    // send eth example
    // const unsignedTx = await ethChainAdapter.buildSendTransaction({
    //   to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
    //   value: '1',
    //   wallet,
    //   path: defaultEthPath
    // })

    // send fox example (erc20)
    // const tx = await ethChainAdapter.buildSendTransaction({
    //   to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
    //   value: '1',
    //   wallet,
    //   path: defaultEthPath,
    //   erc20ContractAddress: foxContractAddress
    // })

    // console.log({ unsignedTx })

    // const signedTx = await ethChainAdapter.signTransaction({ wallet, txToSign: unsignedTx })

    // await ethChainAdapter.broadcastTransaction(signedTx)
    // console.log({ signedTx })
  } catch (err) {
    console.error(err)
  }
}

main().then(() => console.log('DONE'))
