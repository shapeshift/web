import { parseUri } from "@walletconnect/utils"
import SignClient from '@walletconnect/sign-client'
import { getConfig } from "config"
import LegacyWalletConnect from "@walletconnect/client"
import { LegacyWCService } from "./service"
import { ETHWallet } from "@shapeshiftoss/hdwallet-core"

export let WalletConnectSignClient: SignClient

export const getWalletConnect = async (wallet: ETHWallet, uri: string) => {
    const { version } = parseUri(uri)
    console.log("WALLET CONNECT VERSION: ", version)
    if (version === 1) {
        return new LegacyWCService(wallet, new LegacyWalletConnect({ uri }))
    } else {
        await WalletConnectSignClient.pair({ uri })
        return WalletConnectSignClient
    }
}


export async function createSignClient() {
    WalletConnectSignClient = await SignClient.init({
        logger: 'debug',
        projectId: getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID ?? "14d36ca1bc76a70273d44d384e8475ae",
        metadata: {
            name: 'KeepKey Desktop',
            description: 'KeepKey Desktop Application',
            url: 'https://keepkey.com/',
            icons: ['https://github.com/BitHighlander/keepkey-desktop/raw/master/electron/icon.png']
        }
    })

    return WalletConnectSignClient
}
