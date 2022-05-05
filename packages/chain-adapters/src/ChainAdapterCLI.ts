/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP44Params, ChainTypes } from '@shapeshiftoss/types'
import dotenv from 'dotenv'

import { cosmossdk } from './'
import { ChainAdapterManager } from './ChainAdapterManager'

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

const main = async () => {
  try {
    const chainAdapterManager = new ChainAdapterManager(unchainedUrls)
    const wallet = await getWallet()
    await wallet.wipe()
    await wallet.loadDevice({
      mnemonic: process.env.CLI_MNEMONIC as string,
      label: 'test',
      skipChecksum: true
    })

    // /** BITCOIN CLI */
    // const btcChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)
    // const btcBip44Params: BIP44Params = {
    //   purpose: 84,
    //   coinType: 0,
    //   accountNumber: 0,
    //   isChange: false,
    //   index: 10
    // }

    // const btcAddress = await btcChainAdapter.getAddress({
    //   wallet,
    //   bip44Params: btcBip44Params,
    //   accountType: UtxoAccountType.SegwitNative
    // })
    // console.log('btcAddress:', btcAddress)

    // const btcAccount = await btcChainAdapter.getAccount(btcAddress)
    // console.log('btcAccount:', btcAccount)

    // await btcChainAdapter.subscribeTxs(
    //   { wallet, bip44Params: btcBip44Params, accountType: UtxoAccountType.SegwitNative },
    //   (msg) => console.log(msg),
    //   (err) => console.log(err)
    // )

    // const txInput = {
    //   to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
    //   value: '400',
    //   wallet,
    //   bip44Params: btcBip44Params,
    //   chainSpecific: { accountType: UtxoAccountType.P2pkh, satoshiPerByte: '4' }
    // }

    // try {
    //   const btcUnsignedTx = await btcChainAdapter.buildSendTransaction(txInput)
    //   const btcSignedTx = await btcChainAdapter.signTransaction({
    //     wallet,
    //     txToSign: btcUnsignedTx.txToSign
    //   })
    //   console.log('btcSignedTx:', btcSignedTx)
    //   // const btcTxID = await btcChainAdapter.broadcastTransaction(btcSignedTx)
    //   // console.log('btcTxID: ', btcTxID)
    // } catch (err) {
    //   console.log('btcTx error:', err.message)
    // }

    // /** ETHEREUM CLI */
    // const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
    // const ethBip44Params: BIP44Params = { purpose: 44, coinType: 60, accountNumber: 0 }

    // const ethAddress = await ethChainAdapter.getAddress({ wallet, bip44Params: ethBip44Params })
    // console.log('ethAddress:', ethAddress)

    // const ethAccount = await ethChainAdapter.getAccount(ethAddress)
    // console.log('ethAccount:', ethAccount)

    // await ethChainAdapter.subscribeTxs(
    //   { wallet, bip44Params: ethBip44Params },
    //   (msg) => console.log(msg),
    //   (err) => console.log(err)
    // )

    // // estimate gas fees
    // try {
    //   const feeData = await ethChainAdapter.getFeeData({
    //     to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
    //     value: '123',
    //     chainSpecific: {
    //       from: '0x0000000000000000000000000000000000000000',
    //       contractData: '0x'
    //     }
    //   })
    //   console.log('getFeeData', feeData)
    // } catch (err) {
    //   console.log('getFeeDataError:', err.message)
    // }

    // // send eth example
    // try {
    //   const ethUnsignedTx = await ethChainAdapter.buildSendTransaction({
    //     to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
    //     value: '1',
    //     wallet,
    //     bip44Params: ethBip44Params,
    //     chainSpecific: { gasPrice: '0', gasLimit: '0' }
    //   })
    //   const ethSignedTx = await ethChainAdapter.signTransaction({
    //     wallet,
    //     txToSign: ethUnsignedTx.txToSign
    //   })
    //   console.log('ethSignedTx:', ethSignedTx)
    //   // const ethTxID = await ethChainAdapter.broadcastTransaction(ethSignedTx)
    //   // console.log('ethTxID:', ethTxID)
    // } catch (err) {
    //   console.log('ethTx error:', err.message)
    // }

    // // send fox example (erc20)
    // try {
    //   const erc20UnsignedTx = await ethChainAdapter.buildSendTransaction({
    //     to: `0x47CB53752e5dc0A972440dA127DCA9FBA6C2Ab6F`,
    //     value: '1',
    //     wallet,
    //     bip44Params: ethBip44Params,
    //     chainSpecific: { gasPrice: '0', gasLimit: '0', erc20ContractAddress: foxContractAddress }
    //   })
    //   const erc20SignedTx = await ethChainAdapter.signTransaction({
    //     wallet,
    //     txToSign: erc20UnsignedTx.txToSign
    //   })
    //   console.log('erc20SignedTx:', erc20SignedTx)

    //   //const erc20TxID = await ethChainAdapter.broadcastTransaction(erc20SignedTx)
    //   //console.log('erc20TxID:', erc20TxID)
    // } catch (err) {
    //   console.log('erc20Tx error:', err.message)
    // }

    /** COSMOS CLI */
    const cosmosChainAdapter = chainAdapterManager.byChain(ChainTypes.Cosmos)
    const cosmosBip44Params: BIP44Params = { purpose: 44, coinType: 118, accountNumber: 0 }

    const cosmosAddress = await cosmosChainAdapter.getAddress({
      wallet,
      bip44Params: cosmosBip44Params
    })
    console.log('cosmosAddress:', cosmosAddress)

    const cosmosAccount = await cosmosChainAdapter.getAccount(cosmosAddress)
    console.log('cosmosAccount:', cosmosAccount)

    const cosmosTxHistory = await cosmosChainAdapter.getTxHistory({ pubkey: cosmosAddress })
    console.log('cosmosTxHistory:', cosmosTxHistory)

    const cosmosShapeShiftValidator = await (
      cosmosChainAdapter as cosmossdk.cosmos.ChainAdapter
    ).getValidator('cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf')
    console.log('cosmosShapeShiftValidator:', cosmosShapeShiftValidator)

    await cosmosChainAdapter.subscribeTxs(
      { wallet, bip44Params: cosmosBip44Params },
      (msg) => console.log(msg),
      (err) => console.log(err)
    )

    // send cosmos example
    try {
      // const value = '99000'

      const feeData = await cosmosChainAdapter.getFeeData({ sendMax: false })
      const fee = 10 // Increas if taking too long
      const gas = feeData.slow.chainSpecific.gasLimit

      // const cosmosUnsignedTx = await cosmosChainAdapter.buildSendTransaction({
      //   to: 'cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner',
      //   value,
      //   wallet,
      //   bip44Params: cosmosBip44Params,
      //   chainSpecific: { gas, fee }
      // })

      // const cosmosUnsignedTx = await (cosmosChainAdapter as any).claimRewards({
      //   validator: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf', // ShapeShift DAO validator
      //   // value,
      //   wallet,
      //   bip44Params: cosmosBip44Params,
      //   chainSpecific: { gas, fee }
      // })

      const cosmosUnsignedTx = await (cosmosChainAdapter as any).buildRedelegateTransaction({
        fromValidator: 'cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf', // test validator
        toValidator: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf', // ShapeShift DAO validator
        value: '100000000000',
        wallet,
        bip44Params: cosmosBip44Params,
        chainSpecific: { gas, fee }
      })
      if (!cosmosChainAdapter.signAndBroadcastTransaction) return

      console.log('comsos unsigned tx', JSON.stringify(cosmosUnsignedTx, null, 2))

      const broadcastedTx = await cosmosChainAdapter.signAndBroadcastTransaction({
        wallet,
        txToSign: cosmosUnsignedTx.txToSign
      })
      console.log('broadcastedTx:', broadcastedTx)
    } catch (err) {
      console.log('cosmosTx error:', err.message)
    }
  } catch (err) {
    console.error(err)
  }
}

main().then(() => console.log('DONE'))
