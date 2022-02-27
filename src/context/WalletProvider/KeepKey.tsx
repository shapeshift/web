/*
    KeepKey Service

*/
import cryptoTools from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export class KeepKeyService {
  public queryKey: string
  public isInitialized: boolean = false
  public username: string | undefined
  public HDWallet: any
  public bootloaderVersion: string | undefined
  public firmwareVersion: string | undefined
  public latestBootloaderVersion: string | undefined
  public latestFirmareVersion: string | undefined
  public isInUpdaterMode: boolean
  public needsBootloaderUpdate: boolean | undefined
  public needsFirmwareUpdate: boolean | undefined
  public skippedFirmwareUpdate: boolean | undefined
  public initialize: any
  constructor() {
    this.isInUpdaterMode = false
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

  async setUpdaterMode(status: any): Promise<any> {
    try {
      this.isInUpdaterMode = true
    } catch (e) {
      console.error(e)
    }
  }

  async setNeedsBootloaderUpdate(status: any): Promise<any> {
    try {
      this.needsBootloaderUpdate = true
    } catch (e) {
      console.error(e)
    }
  }

  async updateKeepKeyFirmwareLatest(features: any): Promise<any> {
    try {
      //
      console.log("features: ",features)
      this.latestBootloaderVersion = features.bootloaderVersion
      this.latestFirmareVersion = features.latestFirmareVersion

    } catch (e) {
      console.error(e)
    }
  }

  async updateFeatures(features: any): Promise<any> {
    try {
      //
      this.bootloaderVersion = features.bootloaderVersion
      this.firmwareVersion = features.firmwareVersion

      //get latest firmware save in memory


      //if not on latest
      //prompt user to enter bootloader mode
      //allow skip
    } catch (e) {
      console.error(e)
    }
  }

  async pairWallet(walletType: string, HDWallet: any): Promise<any> {
    try {
      this.HDWallet = HDWallet
      // @ts-ignore
      let features = await HDWallet.getFeatures()
      console.log("pairWallet: features:",features)
      if(!features.initilized){
        console.log("KeepKey NOT initialized!")
        this.initialize.open()
      } else {
        console.log("KeepKey initialized!")
      }

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
