import { Keyring } from '@shapeshiftoss/hdwallet-core';
import { KeepKeyHDWallet, TransportDelegate, Transport } from '@shapeshiftoss/hdwallet-keepkey'
import { Device, NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { SoftReset, MessageType } from "@keepkey/device-protocol/lib/messages_pb"
import usb from 'usb'

import log from 'electron-log';


const TAG = ' | WALLET | '

export type GetDeviceReturnType = {
    wallet: KeepKeyHDWallet,
    device: Device,
    transport: TransportDelegate
}

export const getDevice = async function (keyring: Keyring): Promise<GetDeviceReturnType | Error> {
    let tag = TAG + " | getDevice | "
    try {

        console.log('hi', 1)
        await resetDevice()
        console.log('hi', 2)
        const keepkeyAdapter = NodeWebUSBKeepKeyAdapter.useKeyring(keyring);
        console.log('hi', 3)
        const device = await keepkeyAdapter.getDevice()
        console.log('hi', 4)
        const transportDelegate = await keepkeyAdapter.getTransportDelegate(device)
        console.log('hi', 5)



        if (!transportDelegate) return new Error("Unable to connect transport!")
        console.log('hi', 6)
        await transportDelegate.connect()
        console.log('hi', 7)

        let wallet = await keepkeyAdapter.pairDevice(device.serialNumber, true) as KeepKeyHDWallet;
        console.log('PAIRING DEVICE', 2)
        if (wallet) {
            console.log('PAIRING DEVICE', 3)
            log.debug(tag, "Device found!")
            log.debug(tag, "wallet: ", wallet)
        }
        console.log('PAIRING DEVICE', 4)
        return { wallet, device, transport: transportDelegate };
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


const resetDevice = () => new Promise<void>((resolve, reject) => {
    const keepkey = usb.getDeviceList().find((d) => d.deviceDescriptor.idVendor == 11044)
    if (keepkey) {
        keepkey.open()
        keepkey.reset(() => { resolve() })
    }
})