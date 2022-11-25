import { parseUri } from "@walletconnect/utils"
import SignClient from '@walletconnect/sign-client'
import { getConfig } from "config"
import LegacyWalletConnect from "@walletconnect/client"

export let WalletConnectSignClient: SignClient

export const getWalletConnect = async (uri: string) => {
    const { version } = parseUri(uri)
    if (version === 1) {
        return new LegacyWalletConnect({ uri })
    } else {
        await WalletConnectSignClient.pair({ uri })
        return WalletConnectSignClient
    }
}


export async function createSignClient() {
    WalletConnectSignClient = await SignClient.init({
        logger: 'debug',
        projectId: getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID,
        metadata: {
            name: 'KeepKey Desktop',
            description: 'KeepKey Desktop Application',
            url: 'https://keepkey.com/',
            icons: ['https://github.com/BitHighlander/keepkey-desktop/raw/master/electron/icon.png']
        }
    })
}
