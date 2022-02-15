/*
    Pioneer SDK

        A ultra-light bridge to the pioneer platform

              ,    .  ,   .           .
          *  / \_ *  / \_      .-.  *       *   /\'__        *
            /    \  /    \,   ( ₿ )     .    _/  /  \  *'.
       .   /\/\  /\/ :' __ \_   -           _^/  ^/    `--.
          /    \/  \  _/  \-'\      *    /.' ^_   \_   .'\  *
        /\  .-   `. \/     \ /==~=-=~=-=-;.  _/ \ -. `_/   \
       /  `-.__ ^   / .-'.--\ =-=~_=-=~=^/  _ `--./ .-'  `-
      /        `.  / /       `.~-^=-=~=^=.-'      '-._ `._

                             A Product of the CoinMasters Guild
                                              - Highlander

      Api Docs:
        * https://pioneers.dev/docs/
      Transaction Diagram
        * https://github.com/BitHighlander/pioneer/blob/master/docs/pioneerTxs.png

*/
import { SDK } from '@pioneer-sdk/sdk'
import { v4 as uuidv4 } from 'uuid'

export class PioneerService {
  public App: any
  public Api: any
  public queryKey: string
  public pairingCode: string | undefined
  public isInitialized: boolean = false
  public username: string | undefined
  public context: string | undefined
  public assetContext: string | undefined
  public assetBalanceNativeContext: string | undefined
  public assetBalanceUsdValueContext: string | undefined
  public valueUsdContext: string | undefined
  public wallets: any[] | undefined
  public balances: any[]
  public pubkeys: any[]
  public invocations: any[]
  public ACCEPTED_INVOCATIONS: any[]
  public status: any
  public events: any
  public userParams: any
  public user: any
  public totalValueUsd: any
  public walletsIds: any
  public walletDescriptions: any
  public sendToAddress: string | undefined
  public sendToAmountNative: string | undefined
  public sendToNetwork: string | undefined
  public sendToAsset: string | undefined
  public sendToFeeLevel: string | undefined
  public sendInvocation: string | undefined
  constructor() {
    this.ACCEPTED_INVOCATIONS = []
    this.invocations = []
    this.balances = []
    this.pubkeys = []
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

  async getStatus(): Promise<any> {
    let statusResp = await this.Api.Status()
    return statusResp
  }

  async getInvocationStatus(invocationId: string): Promise<any> {
    let statusResp = await this.App.getInvocation(invocationId)
    return statusResp
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
      if (this.App && this.App.pairWallet) {
        if (!this.isInitialized) {
          await this.init()
        }
        if (!this.username) {
          throw Error('Failed to set username!')
        }
        if (!this.App.username) this.App.username = this.username

        if (HDWallet && HDWallet.isInitialized() && this.App.username) {
          await this.App.pairWallet(walletType, HDWallet)
        } else {
          console.error('Can not pairWallet! HDWallet not initialized')
        }

        let userInfo = await this.App.updateContext()
        // if (resultRegister?.username) {
        //   this.username = resultRegister.username
        // }
        // if (resultRegister?.balances) {
        //   this.balances = resultRegister.balances
        // }
        // if (resultRegister?.pubkeys) {
        //   this.pubkeys = resultRegister.pubkeys
        // }
        // if (resultRegister?.context) {
        //   this.context = resultRegister.context
        // }
        return userInfo
      } else {
        throw Error('App not initialized!')
      }
    } catch (e) {
      console.error(e)
    }
  }

  async setSendInvocation(invocation: string): Promise<any> {
    if (invocation) this.sendInvocation = invocation
    return true
  }

  async setSendToFeeLevel(level: string): Promise<any> {
    if (this.sendToFeeLevel && this.sendToFeeLevel !== level) {
      this.sendToFeeLevel = level
      return true
    } else {
      return false
    }
  }

  async setSendToAsset(asset: string): Promise<any> {
    //console.log('sendToAsset: ', asset)
    if (this.sendToAsset && this.sendToAsset !== asset) {
      this.sendToAsset = asset
      return true
    } else {
      //console.log('address already set!: ', asset)
      return false
    }
  }

  /*        //if account not in balances object
        console.log("Register MetaMask Account")
        let pairWalletOnboard:any = {
          name:'MetaMask',
          network:1,
          initialized:true,
          address
        }
        console.log("pairWalletOnboard: ",pairWalletOnboard)
        pioneer.pairWallet(pairWalletOnboard) */

  async setSendToNetwork(network: string): Promise<any> {
    //console.log('sendToNetwork: ', network)
    if (this.sendToNetwork && this.sendToNetwork !== network) {
      this.sendToNetwork = network
      return true
    } else {
      //console.log('address already set!: ', network)
      return false
    }
  }

  async setSendToAmountNative(amount: string): Promise<any> {
    //console.log('setSendToAddress: ', amount)
    if (this.sendToAmountNative && this.sendToAmountNative !== amount) {
      //console.log('Context valid sending request')
      this.sendToAmountNative = amount
    } else {
      //console.log('address already set!: ', amount)
      return false
    }
  }

  async setSendToAddress(address: string): Promise<any> {
    //console.log('setSendToAddress: ', address)
    if (this.sendToAddress && this.sendToAddress !== address) {
      //console.log('Context valid sending request')
      this.sendToAddress = address
      //TODO identify if internal address?
    } else {
      //console.log('address already set!: ', address)
      return false
    }
  }

  async setAssetContext(asset: string): Promise<any> {
    //console.log('setting asset context: ', asset)
    if (this.assetContext && this.assetContext !== asset) {
      //console.log('Context valid sending request')
      this.assetContext = asset
      // push to api context switch
      const success = await this.App.setAssetContext(asset)
      return success
    } else {
      //console.log('Context already asset: ', asset)
      return false
    }
  }

  async switchContext(context: any): Promise<any> {
    //console.log('Switching contexts: ', context)
    if (this.wallets && this.wallets.indexOf(context) >= 0) {
      //console.log('Context valid sending request')
      this.context = context
      // push to api context switch
      const success = await this.App.setContext(context)
      return success
    } else {
      //console.log('Context invalid: ', context)
      //console.log('wallets: ', this.wallets)
      return false
    }
  }

  async signTx(unsignedTx: any): Promise<any> {
    try {
      let signedTx = await this.App.signTx(unsignedTx)

      //updateBody
      // let updateBody = {
      //   network: event.network,
      //   invocationId: event.invocationId,
      //   invocation: invocationInfo,
      //   unsignedTx,
      //   signedTx
      // }
      // //update invocation remote
      // let resultUpdate = await this.App.updateInvocation(updateBody)
      // console.log('resultUpdate: ', resultUpdate)
      //
      // let broadcastResult = await this.App.broadcastTransaction(updateBody)
      // console.log('broadcastResult: ', broadcastResult)
      return signedTx
    } catch (e) {
      console.error('failed to sign! e: ', e)
    }
  }

  async init(): Promise<any> {
    const network = 'mainnet'
    if (!this.queryKey) {
      throw Error('Failed to init! missing queryKey')
    }
    if (!this.username) {
      throw Error('Failed to init! missing username')
    }
    if (!this.isInitialized) {
      this.isInitialized = true

      const config: any = {
        network,
        username: this.username,
        service: process.env.REACT_APP_PIONEER_SERVICE,
        url: process.env.REACT_APP_APP_URL,
        queryKey: this.queryKey,
        wss: process.env.REACT_APP_URL_PIONEER_SOCKET,
        spec: process.env.REACT_APP_URL_PIONEER_SPEC
      }
      this.App = new SDK(config.spec, config)
      this.events = await this.App.startSocket()
      this.events.on('invocations', async (event: any) => {})

      //TODO get chains from api endpoint (auto enable new assets)
      const seedChains = [
        'bitcoin',
        'ethereum',
        'thorchain',
        'bitcoincash',
        'binance',
        'litecoin',
        'cosmos',
        'osmosis'
      ]
      this.Api = await this.App.init(seedChains)
      await this.App.updateContext()
      //TODO get api health

      //TODO get api status
      let statusResp = await this.Api.Status()
      this.status = statusResp.data

      // Sub to events
      // try {
      //   this.events = await this.App.startSocket()
      // } catch (e) {
      //   // delete keypair (force repair)
      //   // localStorage.removeItem('username')
      //   // localStorage.removeItem('queryKey')
      // }

      // handle events
      this.events.on('message', async (event: any) => {
        //console.log('message:', event)
        if (event.paired && event.username) {
          this.username = event.username
          if (this.username != null) {
            localStorage.setItem('username', this.username)
          }
        }
        if (event.type === 'context') {
          //console.log('Switching context!:', event)
          this.context = event.context
          await this.App.setContext(event.context)
          await this.onPair()
        }
      })

      const response = await this.App.createPairingCode()
      if (!response.code) {
        throw Error('102: invalid response! createPairingCode')
      }
      this.pairingCode = response.code

      const info = await this.App.getUserInfo()
      if (!info || info.error) {
        // not paired
        const response = await this.App.createPairingCode()
        if (!response.code) {
          throw Error('102: invalid response! createPairingCode')
        }
        this.pairingCode = response.code

        //console.log('pairingCode: ', this.pairingCode)
        return {
          status: 'App Not Paired!',
          paired: false,
          code: this.pairingCode
        }
      } else {
        //get context
        //balances = context balances

        this.context = info.context
        this.valueUsdContext = info.valueUsdContext
        this.walletsIds = info.wallets
        this.wallets = info.walletDescriptions
        this.walletDescriptions = info.walletDescriptions
        this.totalValueUsd = info.totalValueUsd
        this.username = info.username

        // set context info
        let contextInfo = info.walletDescriptions.filter(
          (e: { context: string | undefined }) => e.context === this.context
        )[0]

        if (contextInfo) {
          this.valueUsdContext = contextInfo.valueUsdContext
          this.balances = contextInfo.balances
          this.pubkeys = contextInfo.pubkeys
        }

        //await this.App.updateContext()

        /*
         */
        //set context
        if (contextInfo) {
          // this.assetContext = 'ATOM'
          // this.assetBalanceNativeContext = contextInfo.balances[this.assetContext]
          // this.assetBalanceUsdValueContext = contextInfo.values[this.assetContext]
        }

        this.events.emit('context', {
          context: this.context,
          //valueUsdContext: this.user.valueUsdContext,
          assetContext: this.assetContext,
          assetBalanceNativeContext: this.assetBalanceNativeContext,
          assetBalanceUsdValueContext: this.assetBalanceUsdValueContext
        })

        return {
          status: 'Online',
          code: this.pairingCode,
          paired: true,
          assetContext: this.assetContext,
          assetBalanceNativeContext: this.assetBalanceNativeContext,
          assetBalanceUsdValueContext: this.assetBalanceUsdValueContext,
          username: this.username,
          context: this.context,
          wallets: this.wallets,
          balances: this.balances,
          pubkeys: this.pubkeys,
          walletsIds: this.walletsIds,
          valueUsdContext: this.valueUsdContext,
          totalValueUsd: this.totalValueUsd
        }
      }
    } else {
      return {
        status: 'Online',
        paired: true,
        code: this.pairingCode,
        assetContext: this.assetContext,
        assetBalanceNativeContext: this.assetBalanceNativeContext,
        assetBalanceUsdValueContext: this.assetBalanceUsdValueContext,
        username: this.username,
        context: this.context,
        wallets: this.wallets,
        balances: this.balances,
        pubkeys: this.pubkeys,
        walletsIds: this.walletsIds,
        valueUsdContext: this.valueUsdContext,
        totalValueUsd: this.totalValueUsd
      }
    }
  }

  /*
      Pioneer Invocation API lifecycle
            docs: https://github.com/BitHighlander/pioneer/blob/master/docs/pioneerTxs.png
      invoke (SDK)
      inspect/approve/sign/broadcast (in desktop app)
      push -> broadcast (SDK)
      confirmations -> (SDK)
      (optional) invoke RPF
          Repeat...

      transfer object example:https://github.com/BitHighlander/pioneer/blob/master/e2e/sdk-transfers/osmosis-e2e-transfer/src/index.ts#L245
  * */
  //build transfer
  async buildTx(transfer: any): Promise<any> {}

  async createPairingCode(): Promise<any> {
    return this.pairingCode
  }

  async sendPairingCode(code: any): Promise<any> {
    if (this.isInitialized) {
      let result = await this.Api.Pair(null, { code })
      return result.data
    } else {
      return {
        error: true,
        msg: 'not initialized'
      }
    }
  }

  async onPair(): Promise<any> {
    const info = await this.App.getUserInfo()
    if (info && !info.error) {
      //console.log('INFO: ', info)
      const userParams = await this.App.getUserParams()
      this.balances = this.App.balances
      this.context = info.context
      // this.valueUsdContext = info.totalValueUsd;
      this.wallets = info.wallets
      // this.valueUsdContext = userInfo.valueUsdContext;
      this.totalValueUsd = info.totalValueUsd
      if (info.username) this.username = info.username
      return userParams
    } else {
      //console.log('no user data found!')
      return {
        success: false,
        error: 'No user info for key'
      }
    }
  }

  async refresh(): Promise<any> {
    const info = await this.App.getUserInfo()
    if (info && !info.error) {
      //console.log('INFO: ', info)
      const userParams = await this.App.getUserParams()
      this.context = info.context
      // this.valueUsdContext = info.totalValueUsd;
      this.wallets = info.wallets
      this.balances = this.App.balances
      // this.valueUsdContext = userInfo.valueUsdContext;
      this.totalValueUsd = info.totalValueUsd
      if (info.username) this.username = info.username
      return userParams
    } else {
      //console.log('no user data found!')
      return {
        success: false,
        error: 'No user info for key'
      }
    }
  }
}
