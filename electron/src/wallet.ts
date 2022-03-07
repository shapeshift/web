import { HDWallet, Keyring } from '@shapeshiftoss/hdwallet-core';
import { NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import log from 'electron-log';


const TAG = ' | WALLET | '

export const getDevice = async function (keyring: Keyring): Promise<HDWallet | Error> {
    let tag = TAG + " | getDevice | "
    try {
        const keepkeyAdapter = NodeWebUSBKeepKeyAdapter.useKeyring(keyring);
        let wallet = await keepkeyAdapter.pairDevice(undefined, true);
        if (wallet) {
            log.debug(tag, "Device found!")
            log.debug(tag, "wallet: ", wallet)
        }
        return wallet;
    } catch (e: any) {
        //log.error(tag,"*** e: ",e.toString())
        log.info("failed to get device: ", e.message)
        if (e.message.indexOf("no devices found") >= 0) {
            return new Error("No devices")
        } else if (e.message.indexOf("claimInterface") >= 0) {
            return new Error("Unable to claim!")
        } else {
            return new Error(e)
        }
    }
}