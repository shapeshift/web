/*
    KeepKey Service

*/
import cryptoTools from 'crypto'
import { v4 as uuidv4 } from 'uuid'
// const keccak256 = require('keccak256')

const bootloaderHashToVersion = {
  '6397c446f6b9002a8b150bf4b9b4e0bb66800ed099b881ca49700139b0559f10': 'v1.0.0',
  'f13ce228c0bb2bdbc56bdcb5f4569367f8e3011074ccc63331348deb498f2d8f': 'v1.0.0',
  'd544b5e06b0c355d68b868ac7580e9bab2d224a1e2440881cc1bca2b816752d5': 'v1.0.1',
  'ec618836f86423dbd3114c37d6e3e4ffdfb87d9e4c6199cf3e163a67b27498a2': 'v1.0.1',
  'cd702b91028a2cfa55af43d3407ba0f6f752a4a2be0583a172983b303ab1032e': 'v1.0.2',
  'bcafb38cd0fbd6e2bdbea89fb90235559fdda360765b74e4a8758b4eff2d4921': 'v1.0.2',
  'cb222548a39ff6cbe2ae2f02c8d431c9ae0df850f814444911f521b95ab02f4c': 'v1.0.3',
  '917d1952260c9b89f3a96bea07eea4074afdcc0e8cdd5d064e36868bdd68ba7d': 'v1.0.3',
  '6465bc505586700a8111c4bf7db6f40af73e720f9e488d20db56135e5a690c4f': 'v1.0.3',
  'db4bc389335e876e942ae3b12558cecd202b745903e79b34dd2c32532708860e': 'v1.0.3',
  '2e38950143cf350345a6ddada4c0c4f21eb2ed337309f39c5dbc70b6c091ae00': 'v1.0.3',
  '83d14cb6c7c48af2a83bc326353ee6b9abdd74cfe47ba567de1cb564da65e8e9': 'v1.0.3',
  '770b30aaa0be884ee8621859f5d055437f894a5c9c7ca22635e7024e059857b7': 'v1.0.4',
  'fc4e5c4dc2e5127b6814a3f69424c936f1dc241d1daf2c5a2d8f0728eb69d20d': 'v1.0.4',
  'e45f587fb07533d832548402d0e71d8e8234881da54d86c4b699c28a6482b0ee': 'v1.1.0',
  '9bf1580d1b21250f922b68794cdadd6c8e166ae5b15ce160a42f8c44a2f05936': 'v2.0.0',
}



export class KeepKeyService {
  public queryKey: string
  public isInitialized: boolean = false
  public username: string | undefined
  public HDWallet: any
  constructor() {
    let queryKey: string | null = localStorage.getItem('queryKey')
    let username: string | null = localStorage.getItem('username')
    if (!queryKey) {
      queryKey = 'key:' + uuidv4()
      localStorage.setItem('queryKey', queryKey)
      this.queryKey = queryKey
    } else {
      this.queryKey = queryKey
    }
    if (!username) {
      username = 'user:' + uuidv4()
      username = username.substring(0, 13)
      localStorage.setItem('username', username)
      this.username = username
    } else {
      this.username = username
    }
  }

  getQueryKey(): string {
    return this.queryKey
  }

  getUsername(): string {
    return this.username as string
  }

  forget(): boolean {
    localStorage.removeItem('queryKey')
    localStorage.removeItem('username')
    return true
  }

  async pairWallet(walletType: string, HDWallet: any): Promise<any> {
    try {
      this.HDWallet = HDWallet
      // @ts-ignore
      let features = await HDWallet.getFeatures()
      console.log("features:",features)

      //get latest firmware

      //if behind offer update

    } catch (e) {
      console.error(e)
    }
  }

  async signTx(unsignedTx: any): Promise<any> {
    try {
      if (!this.HDWallet) throw Error('Can not not sign if a HDWwallet is not paired!')
      if (!unsignedTx) throw Error('Invalid payload! empty')
      if (!unsignedTx.HDwalletPayload) throw Error('Invalid payload! missing: HDwalletPayload')

      //TODO validate payload
      //TODO validate fee's
      //TODO load EV data

      let signedTx
      let broadcastString
      let buffer
      let txid
      switch (unsignedTx.network) {
        case 'RUNE':
          signedTx = await this.HDWallet.thorchainSignTx(unsignedTx.HDwalletPayload)

          broadcastString = {
            tx: signedTx,
            type: 'cosmos-sdk/StdTx',
            mode: 'sync'
          }
          buffer = Buffer.from(JSON.stringify(broadcastString), 'base64')
          //TODO FIXME
          txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()

          signedTx.serialized = JSON.stringify(broadcastString)
          signedTx.txid = txid
          break
        case 'ATOM':
          signedTx = await this.HDWallet.cosmosSignTx(unsignedTx.HDwalletPayload)
          txid = cryptoTools.createHash('sha256').update(signedTx).digest('hex').toUpperCase()

          signedTx.serialized = broadcastString
          signedTx.txid = txid
          break
        case 'OSMO':
          signedTx = await this.HDWallet.osmosisSignTx(unsignedTx.HDwalletPayload)
          broadcastString = {
            tx: signedTx,
            type: 'cosmos-sdk/StdTx',
            mode: 'sync'
          }
          buffer = Buffer.from(JSON.stringify(broadcastString), 'base64')
          //TODO FIXME
          txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()
          signedTx.txid = txid
          signedTx.serialized = JSON.stringify(broadcastString)
          break
        case 'ETH':
          signedTx = await this.HDWallet.ethSignTx(unsignedTx.HDwalletPayload)
          //TODO do txid hashing in HDwallet
          //txid = keccak256(signedTx.serialized).toString('hex')
          txid = 'broke'
          signedTx.txid = txid
          break
        case 'BTC':
        case 'BCH':
        case 'LTC':
        case 'DOGE':
        case 'DASH':
        case 'DGB':
        case 'RDD':
          signedTx = await this.HDWallet.btcSignTx(unsignedTx.HDwalletPayload)
          break
        default:
          throw Error('network not supported! ' + unsignedTx.network)
      }

      return signedTx
    } catch (e) {
      console.error('failed to sign! e: ', e)
    }
  }

  async init(): Promise<any> {
    if (!this.queryKey) {
      throw Error('Failed to init! missing queryKey')
    }
    if (!this.username) {
      throw Error('Failed to init! missing username')
    }
    if (!this.isInitialized) {
      this.isInitialized = true
    } else {
      return {
        status: 'Online'
      }
    }
  }
}
