/*
    Wallet Connect

    ref:https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts
 */


import WalletConnect from "@walletconnect/client";

import log from 'electron-log'
import { ipcMain, IpcMainEvent } from "electron";

import { uniqueId } from 'lodash';
import { shared } from "./shared";
import wait from 'wait-promise'
import { createWindow, windows } from './main';
import axios from "axios";
const sleep = wait.sleep;
export let walletConnectClient: any
const keccak256 = require('keccak256')

export function getCachedSession(): any {
    const local = localStorage ? localStorage.getItem("walletconnect") : null;

    let session = null;
    if (local) {
        try {
            session = JSON.parse(local);
        } catch (error) {
            throw error;
        }
    }
    return session;
}

/*



 */

export async function approveWalletConnect(proposal: any, accounts: Array<string>) {
    let tag = " | approveWalletConnect | "
    try {
        if (accounts.length === 0) {
            log.info(tag, "shared: ", shared.USER)
            const ethAccount = shared.USER.accounts.find((a) => a.caip === 'eip155:1')
            if (ethAccount) accounts = [`${ethAccount.caip}:${ethAccount.pubkey}`]
            // throw Error("Failed to load accounts!")
        }

        //


        log.info(tag, proposal)
        log.info(tag, "debug: ", JSON.stringify({ chainId: 1, accounts }))
        const approve = await walletConnectClient.approveSession({ chainId: 1, accounts })
        log.info(tag, "approve response: ", approve)
    } catch (e) {
        log.error(e)
    }
}

/*

session_request

{
   "type":"walletconnect",
   "data":{
      "id":1647362525352040,
      "jsonrpc":"2.0",
      "method":"session_request",
      "params":[
         {
            "peerId":"ebc4eaa3-d22f-42d3-858e-808f4f6f60a1",
            "peerMeta":{
               "description":"Swap or provide liquidity on the Uniswap Protocol",
               "url":"https://app.uniswap.org",
               "icons":[
                  "https://app.uniswap.org/./favicon.png",
                  "https://app.uniswap.org/./images/192x192_App_Icon.png",
                  "https://app.uniswap.org/./images/512x512_App_Icon.png"
               ],
               "name":"Uniswap Interface"
            },
            "chainId":1
         }
      ]
   },
   "nonce":"1"
}

 */

export async function pairWalletConnect(event: any, payload: any) {
    let tag = " | pairWalletConnect | "
    try {
        log.info(tag, "payload: ", payload)
        //connect to URI
        walletConnectClient = new WalletConnect({ uri: payload });

        if (!walletConnectClient.connected) {
            let success = await walletConnectClient.createSession();
            log.info(tag, "success: ", success)
        }

        walletConnectClient.on("session_request", (error, payload) => {
            console.log("EVENT", "session_request");
            console.log("payload: ", JSON.stringify(payload));
            const nonce = uniqueId()

            log.info(tag, "params: ", JSON.stringify({
                type: 'walletconnect',
                data: payload,
                nonce
            }))
            event.sender.send("@modal/pair", {
                type: 'walletconnect',
                data: payload,
                nonce
            });

            //
            ipcMain.once(`@walletconnect/approve-${nonce}`, (event, data) => {
                approveWalletConnect(data.proposal, data.accounts)
            })

        });

        /*

        sample event

        {
           id: 1647363828590105,
           jsonrpc: '2.0',
           method: 'eth_sendTransaction',
           params: [
             {
               gas: '0xd9e6',
               from: '0x33b35c665496ba8e71b22373843376740401f106',
               to: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
               data: '0x095ea7b300000000000000000000000068b3465833fb72a70ecdf485e0e4c7bd8665fc45ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
             }
           ]
         }


         //method eth_signTypedData_v4
         params [
           '0x33b35c665496bA8E71B22373843376740401F106',
           '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"domain":{"name":"USD Coin","version":"2","verifyingContract":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","chainId":1},"primaryType":"Permit","message":{"owner":"0x33b35c665496bA8E71B22373843376740401F106","spender":"0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45","value":"5056513","nonce":0,"deadline":1647408940}}'
         ]

         */

        walletConnectClient.on("call_request", async (error, payload) => {
            console.log("EVENT", "call_request");
            console.log("payload: ", payload);
            console.log("method", payload.method);
            console.log("params", payload.params);
            let { method, params } = payload

            //TODO moveme
            // await unchainedEth.init()
            //
            //
            // console.log("unchainedEth", unchainedEth);
            // console.log("unchainedEth", unchainedEth.instance);
            //
            // //getNonce
            // let accountInfo = await unchainedEth.instance.GetAccount(params[0].from)
            // console.log("accountInfo: ",accountInfo)

            //gasPrice
            let gasInfo = await axios.get("https://api.ethereum.shapeshift.com/api/v1/gas/fees")
            gasInfo = gasInfo.data
            console.log("gasInfo: ", gasInfo)
            // @ts-ignore
            let gasPrice = Number(parseInt(gasInfo.gasPrice))
            console.log("gasPrice: ", gasPrice)
            // @ts-ignore
            gasPrice = parseInt(gasPrice)
            console.log("gasPrice: ", gasPrice)
            //@ts-ignore
            gasPrice = "0x" + gasPrice.toString(16);
            console.log("gasPrice: ", gasPrice)

            let HDwalletPayload
            let from
            let accountInfo
            switch (method) {
                case 'eth_signTypedData_v4':
                    //TODO handle EIP712 better
                    from = params[0]

                    accountInfo = await axios.get("https://dev-api.ethereum.shapeshift.com/api/v1/account/" + from)
                    accountInfo = accountInfo.data
                    console.log("accountInfo: ", accountInfo)

                    // @ts-ignore
                    let nonce = accountInfo.nonce
                    console.log("nonce: ", nonce)
                    nonce = "0x" + nonce.toString(16);
                    console.log("nonce: ", nonce)

                    //TODO track last Nonce Users
                    //if nonce <= lastNonceUsed
                    //nonce = lastNonceUsed + 1

                    let typedParams = JSON.parse(params[1])
                    let value = typedParams.message.value.toString(16)
                    value = "0x" + value

                    HDwalletPayload = {
                        "addressNList": [
                            2147483692,
                            2147483708,
                            2147483648,
                            0,
                            0
                        ],
                        "nonce": nonce,
                        "gasPrice": gasPrice, //TODO lookup gasPrice
                        "gasLimit": "0x13880", //TODO lookup gasLimit
                        "value": value || "0x0",
                        "to": typedParams.owner,
                        "data": typedParams.spender,
                        "chainId": 1
                    }
                    break;
                case 'eth_sendTransaction':
                    from = params[0].from

                    accountInfo = await axios.get("https://dev-api.ethereum.shapeshift.com/api/v1/account/" + params[0].from)
                    accountInfo = accountInfo.data
                    console.log("accountInfo: ", accountInfo)


                    // @ts-ignore
                    let nonce = accountInfo.nonce
                    console.log("nonce: ", nonce)
                    nonce = "0x" + nonce.toString(16);
                    console.log("nonce: ", nonce)

                    //TODO track last Nonce Users
                    //if nonce <= lastNonceUsed
                    //nonce = lastNonceUsed + 1

                    HDwalletPayload = {
                        "addressNList": [
                            2147483692,
                            2147483708,
                            2147483648,
                            0,
                            0
                        ],
                        "nonce": nonce,
                        "gasPrice": gasPrice, //TODO lookup gasPrice
                        "gasLimit": params[0].gas, //TODO lookup gasLimit
                        "value": params[0].value || "0x0",
                        "to": params[0].to,
                        "data": params[0].data,
                        "chainId": 1
                    }
                    break;
                default:
                    throw Error("Unhandled Method: " + method)
            }


            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                if (!await createWindow()) return
            }

            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) return
            log.info(tag, "HDwalletPayload: ", HDwalletPayload)
            let args = {
                payload: {
                    data: {
                        invocation: {
                            unsignedTx: {
                                "network": "ETH",
                                "asset": "ETH",
                                "transaction": {
                                    "context": params[0].from,
                                    "type": "transfer",
                                    "addressFrom": params[0].from,
                                    "recipient": params[0].to,
                                    "asset": "ETH",
                                    "network": "ETH",
                                    "memo": "",
                                    "amount": "0.0001",
                                    "fee": {
                                        "priority": 5
                                    },
                                    "noBroadcast": true
                                },
                                HDwalletPayload,
                                "verbal": "Ethereum transaction"
                            }
                        }
                    }
                }
            }
            log.info(tag, "args: ", args)
            log.info(tag, "args: ", JSON.stringify(args))
            windows.mainWindow.webContents.send('signTx', args);

            //hold till signed
            while (!shared.SIGNED_TX) {
                console.log("waiting!")
                await sleep(300)
            }

            let response = shared.SIGNED_TX
            log.info(tag, "response: ", response)

            //broadcast
            let body = {
                hex: response.serialized
            }

            //get txid always (even if failed to broadcast)
            let txid = keccak256(response.serialized).toString('hex')
            txid = "0x" + txid
            log.info(tag, "txid: ", txid)

            //respond
            let successRespond = await walletConnectClient.approveRequest({
                id: payload.id,
                result: txid,
            })
            log.info(tag, "successRespond: ", successRespond)

            log.info(tag, "body: ", body)
            let result
            try {
                result = await axios.post("https://dev-api.ethereum.shapeshift.com/api/v1/send", body)
                result = result.data
                log.info(tag, "result: ", result)
            } catch (e) {
                log.error("e: ", e)
                log.info(tag, "error: ", e)
                // @ts-ignore
                log.info(tag, "error: ", e.body)
                // @ts-ignore
                if (e.body.error === 'nonce too low') {
                    //re-submit with nonce +1
                }

                //TODO show error to user!

            }

        });

        walletConnectClient.on("connect", (error, payload) => {
            console.log("EVENT", "connect");
            console.log("payload: ", payload);

        });

        walletConnectClient.on("session_update", (error, payload) => {
            console.log("EVENT", "session_update");
            console.log("payload: ", payload);

        });

        walletConnectClient.on("connect", (error, payload) => {
            console.log("EVENT", "connect");
            console.log("payload: ", payload);

        });

        walletConnectClient.on("disconnect", (error, payload) => {
            console.log("EVENT", "disconnect");
            console.log("payload: ", payload);

        });

        // //TODO UX pairing
        // event.sender.send("@app/onSuccessPair", {});
    } catch (e) {
        log.error(e)
    }
}


export async function createWalletConnectClient(event: IpcMainEvent) {
    let tag = " | createWalletConnectClient | "
    try {
        //
        const session = getCachedSession();
        log.info(tag, "session: ", session)

        if (session) {
            walletConnectClient = new WalletConnect({ session });
        } else {
            log.info(tag, "no session found!")
        }

    } catch (e) {
        log.error(e)
    }
}

