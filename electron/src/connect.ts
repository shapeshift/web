/*
    Wallet Connect

    ref:https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts
 */


import WalletConnectClient from '@walletconnect/client'
import { CLIENT_EVENTS } from '@walletconnect/client'
import log from 'electron-log'
import { app, IpcMainEvent } from "electron";

export let walletConnectClient: WalletConnectClient

export const EIP155_SIGNING_METHODS = {
    PERSONAL_SIGN: 'personal_sign',
    ETH_SIGN: 'eth_sign',
    ETH_SIGN_TRANSACTION: 'eth_signTransaction',
    ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
    ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
    ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
    ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
    ETH_SEND_TRANSACTION: 'eth_sendTransaction'
}

/**
 * Chains
 */
export const COSMOS_MAINNET_CHAINS = {
    'cosmos:cosmoshub-4': {
        chainId: 'cosmoshub-4',
        name: 'Cosmos Hub',
        logo: '/chain-logos/cosmos-cosmoshub-4.png',
        rgb: '107, 111, 147',
        rpc: ''
    }
}


/**
 * Methods
 */
export const COSMOS_SIGNING_METHODS = {
    COSMOS_SIGN_DIRECT: 'cosmos_signDirect',
    COSMOS_SIGN_AMINO: 'cosmos_signAmino'
}

/*

example event
{
   relay: { protocol: 'waku' },
   topic: '0537892ecb22ca40b14e6fcd6f8190a110fa9a2782c993397821c36ec26c4322',
   proposer: {
     publicKey: 'f961e93e195d1b118bffef3ad5ff4aaf2aa80bbf8168ba3fbd73445d81832561',
     controller: false,
     metadata: {
       description: 'React App for WalletConnect',
       url: 'https://react-app.walletconnect.com',
       icons: '[array]',
       name: 'React App'
     }
   },
   signal: {
     method: 'pairing',
     params: {
       topic: '95adfef496af30fe59aea86aca1ee3ccfaefe8390fc6b25b1850643d606b3532'
     }
   },
   permissions: {
     blockchain: { chains: '[array]' },
     jsonrpc: { methods: '[array]' },
     notifications: { types: '[array]' }
   },
   ttl: 604800
 }


 */

export async function approveWalletConnect(event: any, payload: any) {
    let tag = " | pairWalletConnect | "
    try {
        // let proposal = {
        //     "relay":{
        //         "protocol":"waku"
        //     },
        //     "topic":"827c48aeaad46ed796b0ca52825373e9893f66c7735bd3e1cb4b44d56f4e4308",
        //     "proposer":{
        //         "publicKey":"c4dc6e2b7ffedef5370ceb1edf79e5cdc9c3100941e9e5590e67e5178d6fd958",
        //         "controller":false,
        //         "metadata":{
        //             "description":"React App for WalletConnect",
        //             "url":"https://react-app.walletconnect.com",
        //             "icons":[
        //                 "https://react-app.walletconnect.com/favicon.ico"
        //             ],
        //             "name":"React App"
        //         }
        //     },
        //     "signal":{
        //         "method":"pairing",
        //         "params":{
        //             "topic":"4ee2bb7aa62095430ef208742dac19097070d142d4ab8c4fd882d4312bbbd669"
        //         }
        //     },
        //     "permissions":{
        //         "blockchain":{
        //             "chains":[
        //                 "eip155:1"
        //             ]
        //         },
        //         "jsonrpc":{
        //             "methods":[
        //                 "eth_sendTransaction",
        //                 "eth_signTransaction",
        //                 "eth_sign",
        //                 "personal_sign",
        //                 "eth_signTypedData"
        //             ]
        //         },
        //         "notifications":{
        //             "types":[
        //
        //             ]
        //         }
        //     },
        //     "ttl":604800
        // }
        //
        // //
        // const accounts = ['0xBlaBlaTesting']
        // const response = {
        //     state: {
        //         accounts
        //     }
        // }
        // await walletConnectClient.approve({ proposal, response })
    } catch (e) {
        log.error(e)
    }
}


export async function pairWalletConnect(event: any, payload: any) {
    let tag = " | pairWalletConnect | "
    try {
        log.info(tag, "payload: ", payload)
        if (!walletConnectClient) createWalletConnectClient(event)
        //connect to URI
        let success = await walletConnectClient.pair({ uri: payload })
        log.info(tag, "success: ", success)

        // //TODO UX pairing
        // event.sender.send("@app/onSuccessPair", {});
    } catch (e) {
        log.error(e)
    }
}


export async function createWalletConnectClient(event: IpcMainEvent) {
    //TODO wtf types
    walletConnectClient = await WalletConnectClient.init({
        controller: true,
        projectId: "14d36ca1bc76a70273d44d384e8475ae",
        relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
        metadata: {
            name: 'KeepKey Desktop',
            description: 'a companion app for the KeepKey device',
            url: 'https://keepkey.com/',
            icons: ['https://assets.website-files.com/5cec55545d0f47cfe2a39a8e/5e9bcf1fd3886ab687f29cdc_logo%20(2).png']
        }
    })

    //Wallet Connect Events
    //ref https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/hooks/useWalletConnectEventsManager.ts


    /*
        Example
        {
            "relay":{
                "protocol":"waku"
            },
            "topic":"827c48aeaad46ed796b0ca52825373e9893f66c7735bd3e1cb4b44d56f4e4308",
            "proposer":{
                "publicKey":"c4dc6e2b7ffedef5370ceb1edf79e5cdc9c3100941e9e5590e67e5178d6fd958",
                "controller":false,
                "metadata":{
                    "description":"React App for WalletConnect",
                    "url":"https://react-app.walletconnect.com",
                    "icons":[
                        "https://react-app.walletconnect.com/favicon.ico"
                    ],
                    "name":"React App"
                }
            },
            "signal":{
                "method":"pairing",
                "params":{
                    "topic":"4ee2bb7aa62095430ef208742dac19097070d142d4ab8c4fd882d4312bbbd669"
                }
            },
            "permissions":{
                "blockchain":{
                    "chains":[
                        "eip155:1"
                    ]
                },
                "jsonrpc":{
                    "methods":[
                        "eth_sendTransaction",
                        "eth_signTransaction",
                        "eth_sign",
                        "personal_sign",
                        "eth_signTypedData"
                    ]
                },
                "notifications":{
                    "types":[

                    ]
                }
            },
            "ttl":604800
        }

     */
    let onSessionProposal = function (params: any) {
        let tag = " | onSessionProposal | "
        try {
            log.info(tag, "params: ", params)
            log.info(tag, "params: ",JSON.stringify(params))

            //TODO do something
            event.sender.send("@app/onSessionProposal", {});
        } catch (e) {
            log.error(e)
        }
    }

    //A dapp created a session
    let onSessionCreated = function (params: any) {
        let tag = " | onSessionCreated | "
        try {
            log.info(tag, "params: ", params)
            log.info(tag, "params: ",JSON.stringify(params))

            //TODO save dapp into pairing
            event.sender.send("@app/onSessionCreated", {});
        } catch (e) {
            log.error(e)
        }
    }

    /*
            Example unsignedTx

        //Unsigned TX
        let unsignedTx =  {
            "network":"ETH",
            "asset":"ETH",
            "transaction":{
                "context":"0x33b35c665496bA8E71B22373843376740401F106.wallet",
                "type":"transfer",
                "addressFrom":"0x33b35c665496bA8E71B22373843376740401F106",
                "recipient":"0x33b35c665496bA8E71B22373843376740401F106",
                "asset":"ETH",
                "network":"ETH",
                "memo":"",
                "amount":"0.0001",
                "fee":{
                    "priority":5
                },
                "noBroadcast":true
            },
            "HDwalletPayload":{
                "addressNList":[
                    2147483692,
                    2147483708,
                    2147483648,
                    0,
                    0
                ],
                "nonce":"0x2c4",
                "gasPrice":"0xf22d45af6",
                "gasLimit":"0x13880",
                "value":"0x5af3107a4000",
                "to":"0x33b35c665496bA8E71B22373843376740401F106",
                "data":"",
                "chainId":1
            },
            "verbal":"Ethereum transaction"
        }


     */
    let onSignRequest = function (params: any) {
        let tag = " | onSignRequest | "
        try {
            log.info(tag, "params: ", params)
            const { topic, request } = params
            const { method } = request

            //Notes On types of SignTxs
            //TODO convert walletConnect signTx to HDwalletPayload
            let HDwalletPayload = {}
            let network
            let asset
            switch (method) {
                case EIP155_SIGNING_METHODS.ETH_SIGN:
                case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
                    network = "ETH"
                    asset = "ETH" //TODO detect token
                    //TODO convert
                    HDwalletPayload = {}
                case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
                case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
                case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
                    //TODO convert
                    network = "ETH"
                    HDwalletPayload = {}
                case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
                case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
                    network = "ETH"
                    //TODO convert
                    HDwalletPayload = {}
                case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
                case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
                    network = "COSMOS"
                    //TODO convert
                    HDwalletPayload = {}
                default:
                //Push Error to ipc UNKNOWN tx type!
            }
            event.sender.send('signTx', { unsignedTx: { HDwalletPayload } });
        } catch (e) {
            log.error(e)
        }
    }

    walletConnectClient.on(CLIENT_EVENTS.session.proposal, onSessionProposal)

    walletConnectClient.on(CLIENT_EVENTS.session.created, onSessionCreated)

    walletConnectClient.on(CLIENT_EVENTS.session.request, onSignRequest)

    return true
}

