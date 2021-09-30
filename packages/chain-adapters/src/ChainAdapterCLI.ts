import { ChainAdapterManager } from './ChainAdapterManager'
import { ChainTypes } from '@shapeshiftoss/types'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import dotenv from 'dotenv'
dotenv.config()

// const foxContractAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
const defaultEthPath = `m/44'/60'/0'/0/0`

const getWallet = async (): Promise<HDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: process.env.CLI_MNEMONIC,
    deviceId: 'test'
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

const unchainedUrls = {
  [ChainTypes.Ethereum]: 'http://localhost:31300/api/v1'
}

const main = async () => {
  try {
    const chainAdapterManager = new ChainAdapterManager(unchainedUrls)
    const wallet = await getWallet()
    const ethChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
    const address = await ethChainAdapter.getAddress({ wallet, path: defaultEthPath })

    const balanceInfo = await ethChainAdapter.getBalance(address)
    // const txHistory = await ethChainAdapter.getTxHistory(address)
    console.info({ balance: balanceInfo?.tokens })
    // console.dir({ txHistory }, { color: true, depth: 4 })

    //    console.log('Wallet address is', address)

    // // // send eth example
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
