/* eslint-disable @typescript-eslint/no-unused-vars */
import { NativeAdapterArgs, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import dotenv from 'dotenv'

import { ChainAdapter as CosmosChainAdapter } from './cosmossdk/cosmos'
import { ChainAdapter as OsmosisChainAdapter } from './cosmossdk/osmosis'
import { ChainAdapter as ThorchainChainAdapter } from './cosmossdk/thorchain'
import { ChainAdapter as EthereumChainAdapter } from './evm/ethereum'
import { ChainAdapter as BitcoinChainAdapter } from './utxo/bitcoin'
import { ChainAdapter as DogecoinChainAdapter } from './utxo/dogecoin'

dotenv.config()

const btcChainAdapter = new BitcoinChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.bitcoin.Tx>('wss://dev-api.bitcoin.shapeshift.com'),
    http: new unchained.bitcoin.V1Api(
      new unchained.bitcoin.Configuration({ basePath: 'https://dev-api.bitcoin.shapeshift.com' }),
    ),
  },
  coinName: 'Bitcoin',
})

const dogeChainAdapter = new DogecoinChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.dogecoin.Tx>('wss://dev-api.dogecoin.shapeshift.com'),
    http: new unchained.dogecoin.V1Api(
      new unchained.dogecoin.Configuration({ basePath: 'https://dev-api.dogecoin.shapeshift.com' }),
    ),
  },
  coinName: 'Dogecoin',
})

const ethChainAdapter = new EthereumChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.ethereum.Tx>('wss://dev-api.ethereum.shapeshift.com'),
    http: new unchained.ethereum.V1Api(
      new unchained.ethereum.Configuration({ basePath: 'https://dev-api.ethereum.shapeshift.com' }),
    ),
  },
  rpcUrl: 'https://mainnet.infura.io/v3/d734c7eebcdf400185d7eb67322a7e57',
})

const cosmosChainAdapter = new CosmosChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.cosmossdk.Tx>('wss://dev-api.cosmos.shapeshift.com'),
    http: new unchained.cosmos.V1Api(
      new unchained.cosmos.Configuration({ basePath: 'https://dev-api.cosmos.shapeshift.com' }),
    ),
  },
  coinName: 'Cosmos',
})

const osmosisChainAdapter = new OsmosisChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.cosmossdk.Tx>('wss://dev-api.osmosis.shapeshift.com'),
    http: new unchained.osmosis.V1Api(
      new unchained.osmosis.Configuration({ basePath: 'https://dev-api.osmosis.shapeshift.com' }),
    ),
  },
  coinName: 'Osmosis',
})

const thorchainChainAdapter = new ThorchainChainAdapter({
  providers: {
    ws: new unchained.ws.Client<unchained.cosmossdk.Tx>('wss://dev-api.thorchain.shapeshift.com'),
    http: new unchained.thorchain.V1Api(
      new unchained.thorchain.Configuration({
        basePath: 'https://dev-api.thorchain.shapeshift.com',
      }),
    ),
  },
  coinName: 'Thorchain',
})

const adapters = {
  btc: btcChainAdapter,
  doge: dogeChainAdapter,
  eth: ethChainAdapter,
  cosmos: cosmosChainAdapter,
  osmosis: osmosisChainAdapter,
  thorchain: thorchainChainAdapter,
} as const

const getWallet = async (): Promise<NativeHDWallet> => {
  const nativeAdapterArgs: NativeAdapterArgs = {
    mnemonic: process.env.CLI_MNEMONIC,
    deviceId: 'test',
  }
  const wallet = new NativeHDWallet(nativeAdapterArgs)
  await wallet.initialize()

  return wallet
}

// @ts-ignore:nextLine
const testBitcoin = async (wallet: NativeHDWallet, broadcast = false) => {
  const chainAdapter = adapters.btc
  const bip44Params: BIP44Params = {
    purpose: 84,
    coinType: 0,
    accountNumber: 0,
    isChange: false,
    index: 10,
  }

  const address = await chainAdapter.getAddress({
    wallet,
    bip44Params,
    accountType: UtxoAccountType.SegwitNative,
  })
  console.log('bitcoin: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('bitcoin: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('bitcoin: txHistory:', txHistory)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params, accountType: UtxoAccountType.SegwitNative },
    (msg) => console.log('bitcoin: tx:', msg),
    (err) => console.log(err),
  )

  try {
    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: 'bc1qppzsgs9pt63cx9x994wf4e3qrpta0nm6htk9v4',
      value: '400',
      wallet,
      bip44Params,
      chainSpecific: { accountType: UtxoAccountType.SegwitNative, satoshiPerByte: '4' },
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
const testEthereum = async (wallet: NativeHDWallet, broadcast = false) => {
  const chainAdapter = adapters.eth
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
    (err) => console.log(err),
  )

  try {
    const feeData = await chainAdapter.getFeeData({
      to: '0x642F4Bda144C63f6DC47EE0fDfbac0a193e2eDb7',
      value: '123',
      chainSpecific: {
        from: '0x0000000000000000000000000000000000000000',
        contractData: '0x',
      },
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
      chainSpecific: { gasPrice: '0', gasLimit: '0' },
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
      txToSign: unsignedTx.txToSign,
    })
    console.log('ethereum: signedTx:', signedTx)

    if (broadcast) {
      const txid = await chainAdapter.broadcastTransaction(signedTx)
      console.log('ethereum: txid:', txid)
    }
  } catch (err) {
    console.log('ethereum: tx error:', err.message)
  }

  try {
    const signedMessage = await chainAdapter.signMessage({
      wallet,
      messageToSign: {
        message: 'Hello world 222',
        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
      },
    })
    console.log('ethereum: signedMessage', signedMessage)
  } catch (err) {
    console.log('ethereum: signMessage error:', err.message)
  }
}

// @ts-ignore:nextLine
const testCosmos = async (wallet: NativeHDWallet, broadcast = false) => {
  const chainAdapter = adapters.cosmos
  const bip44Params: BIP44Params = { purpose: 44, coinType: 118, accountNumber: 0 }

  const address = await chainAdapter.getAddress({ wallet, bip44Params })
  console.log('cosmos: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('cosmos: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('cosmos: txHistory:', txHistory)

  const shapeshiftValidator = await chainAdapter.getValidator(
    'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
  )
  console.log('cosmos: shapeshiftValidator:', shapeshiftValidator)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params },
    (msg) => console.log('cosmos: tx:', msg),
    (err) => console.log(err),
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
      chainSpecific: { gas, fee },
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
        txToSign: unsignedTx.txToSign,
      })
      console.log('cosmos: txid:', txid)
    }
  } catch (err) {
    console.log('cosmos: tx error:', err.message)
  }
}

// @ts-ignore:nextLine
const testThorchain = async (wallet: NativeHDWallet, broadcast = false) => {
  const chainAdapter = adapters.thorchain
  const bip44Params = chainAdapter.buildBIP44Params({})

  const address = await chainAdapter.getAddress({ wallet, bip44Params })
  console.log('thorchain: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('thorchain: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('thorchain: txHistory:', txHistory)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params },
    (msg) => console.log('thorchain: tx:', msg),
    (err) => console.log(err),
  )

  // send thorchain example
  try {
    const feeData = await chainAdapter.getFeeData({ sendMax: false })

    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: 'thor1wfpvj3txl0z82wfm6kvagfyagsmzvpyrg3c9fm',
      value: '99000',
      wallet,
      bip44Params,
      chainSpecific: { gas: feeData.average.chainSpecific.gasLimit, fee: feeData.average.txFee },
    })
    console.log('cosmos: unsignedTx:', JSON.stringify(unsignedTx, null, 2))

    if (broadcast) {
      const txid = await chainAdapter.signAndBroadcastTransaction({
        wallet,
        txToSign: unsignedTx.txToSign,
      })
      console.log('thorchain: txid:', txid)
    }
  } catch (err) {
    console.log('thorchain: tx error:', err.message)
  }
}

// @ts-ignore:nextLine
const testOsmosis = async (wallet: NativeHDWallet, broadcast = false) => {
  const chainAdapter = adapters.osmosis
  const bip44Params: BIP44Params = { purpose: 44, coinType: 118, accountNumber: 0 }

  const address = await chainAdapter.getAddress({ wallet, bip44Params })
  console.log('osmosis: address:', address)

  const account = await chainAdapter.getAccount(address)
  console.log('osmosis: account:', account)

  const txHistory = await chainAdapter.getTxHistory({ pubkey: address })
  console.log('osmosis: txHistory:', txHistory)

  const shapeshiftValidator = await chainAdapter.getValidator(
    'osmovaloper1xf9zpq5kpxks49cg606tzd8qstaykxgt2vs0d5',
  )
  console.log('osmosis: shapeshiftValidator:', shapeshiftValidator)

  await chainAdapter.subscribeTxs(
    { wallet, bip44Params },
    (msg) => console.log('osmosis: tx:', msg),
    (err) => console.log(err),
  )

  // send osmosis example
  try {
    const feeData = await chainAdapter.getFeeData({ sendMax: false })
    const fee = '10' // increase if taking too long
    const gas = feeData.slow.chainSpecific.gasLimit

    const unsignedTx = await chainAdapter.buildSendTransaction({
      to: 'osmo1thd6u0ezp96fn5fm8zeg6ef26gz4edu34800ev',
      value: '99000',
      wallet,
      bip44Params,
      chainSpecific: { gas, fee },
    })

    // delegate osmosis example
    // const unsignedTx = await chainAdapter.buildDelegateTransaction({
    //   validator: 'osmovaloper1xf9zpq5kpxks49cg606tzd8qstaykxgt2vs0d5', // ShapeShift DAO validator
    //   value: '100000000000',
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    // undelegate osmosis example
    // const unsignedTx = await chainAdapter.buildUndelegateTransaction({
    //   validator: 'osmovaloper1xf9zpq5kpxks49cg606tzd8qstaykxgt2vs0d5', // ShapeShift DAO validator
    //   value: '100000000000',
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    // redelegate osmosis example
    // const unsignedTx = await chainAdapter.buildRedelegateTransaction({
    //   fromValidator: 'osmovaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpf6t4agt', // Figment validator
    //   toValidator: 'osmovaloper1xf9zpq5kpxks49cg606tzd8qstaykxgt2vs0d5', // ShapeShift DAO validator
    //   value: '100000000000',
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    // claim osmosis rewards example
    // const unsignedTx = await chainAdapter.buildClaimRewardsTransaction({
    //   validator: 'osmovaloper1xf9zpq5kpxks49cg606tzd8qstaykxgt2vs0d5', // ShapeShift DAO validator
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    // add osmosis liquidity example
    // const unsignedTx = await chainAdapter.buildLPAddTransaction({
    //   poolId: '1',
    //   shareOutAmount: '8362622348614042193',
    //   tokenInMaxs: [
    //     {
    //       amount: '100346',
    //       denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    //     },
    //     {
    //       amount: '1032378',
    //       denom: 'uosmo',
    //     },
    //   ],
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    // remove osmosis liquidity example
    // const unsignedTx = await chainAdapter.buildLPRemoveTransaction({
    //   poolId: '1',
    //   shareOutAmount: '8362622348614042193',
    //   tokenOutMins: [
    //     {
    //       amount: '143697',
    //       denom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    //     },
    //     {
    //       amount: '1478380',
    //       denom: 'uosmo',
    //     },
    //   ],
    //   wallet,
    //   bip44Params,
    //   chainSpecific: { gas, fee },
    // })

    console.log('cosmos: unsignedTx:', JSON.stringify(unsignedTx, null, 2))

    if (broadcast) {
      const txid = await chainAdapter.signAndBroadcastTransaction({
        wallet,
        txToSign: unsignedTx.txToSign,
      })
      console.log('cosmos: txid:', txid)
    }
  } catch (err) {
    console.log('cosmos: tx error:', err.message)
  }
}

const main = async () => {
  try {
    const wallet = await getWallet()

    await testBitcoin(wallet)
    await testEthereum(wallet)
    await testCosmos(wallet)
    await testThorchain(wallet)
    await testOsmosis(wallet)
  } catch (err) {
    console.error(err)
  }
}

main().then(() => console.log('DONE'))
