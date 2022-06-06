import { toChainId } from '@shapeshiftoss/caip'
import { ChainAdapter, ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { ChainTypes } from '@shapeshiftoss/types'
import dotenv from 'dotenv'

import { bnOrZero } from './utils'
import { YearnInvestor } from './YearnInvestor'

dotenv.config()

const { DEVICE_ID = 'device123', MNEMONIC } = process.env

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
  const unchainedUrls = {
    [ChainTypes.Ethereum]: {
      httpUrl: 'http://api.ethereum.shapeshift.com',
      wsUrl: 'ws://api.ethereum.shapeshift.com'
    }
  }
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const wallet = await getWallet()
  const chainAdapter = adapterManager.byChainId(
    toChainId({ chainNamespace: 'eip155', chainReference: '1' })
  ) as ChainAdapter<ChainTypes.Ethereum>
  const yearnInvestor = new YearnInvestor({
    providerUrl: 'https://daemon.ethereum.shapeshift.com',
    dryRun: true,
    chainAdapter
  })

  const address = '0x358dae76Bb42Be167dD5A64f95E0d537b024834e'
  const usdcCaip19 = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()

  await yearnInvestor.initialize()

  const allOpportunities = await yearnInvestor.findAll()

  const usdcOpportunities = await yearnInvestor.findByUnderlyingAssetId(usdcCaip19)
  const opportunity = usdcOpportunities[1]

  const allowance = await opportunity.allowance(address)
  const approvalPreparedTx = await opportunity.prepareApprove(address)
  const withdrawPreparedTx = await opportunity.prepareDeposit({ address, amount: bnOrZero(1000) })
  const depositPreparedTx = await opportunity.prepareWithdrawal({ address, amount: bnOrZero(1000) })

  const signedTx = await opportunity.signAndBroadcast({
    wallet,
    tx: depositPreparedTx,
    feePriority: 'fast'
  })
  console.info(
    JSON.stringify(
      {
        allOpportunities,
        opportunity,
        allowance,
        approvalPreparedTx,
        depositPreparedTx,
        withdrawPreparedTx,
        signedTx
      },
      null,
      2
    )
  )
}

main()
  .then(() => console.info('Exit'))
  .catch((e) => {
    console.error(e), process.exit(1)
  })
