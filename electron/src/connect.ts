/*
    Wallet Connect

    ref:https://github.com/WalletConnect/web-examples/blob/main/wallets/react-wallet-v2/src/utils/WalletConnectUtil.ts
 */


import WalletConnectClient from '@walletconnect/client'


export let walletConnectClient: WalletConnectClient

export async function createWalletConnectClient() {
    //TODO wtf types
    // @ts-ignore
    walletConnectClient = await WalletConnectClient.init({
        controller: true,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        relayUrl: process.env.NEXT_PUBLIC_RELAY_URL ?? 'wss://relay.walletconnect.com',
        metadata: {
            name: 'KeepKey Desktop',
            description: 'a companion app for the keepkey device',
            url: 'https://keepkey.com/',
            icons: ['https://assets.website-files.com/5cec55545d0f47cfe2a39a8e/5e9bcf1fd3886ab687f29cdc_logo%20(2).png']
        }
    })
}