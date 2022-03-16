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

        await resetDevice()
        const keepkeyAdapter = NodeWebUSBKeepKeyAdapter.useKeyring(keyring);
        const device = await keepkeyAdapter.getDevice()
        const transportDelegate = await keepkeyAdapter.getTransportDelegate(device)

        if (!transportDelegate) return new Error("Unable to connect transport!")


        // const transport = await Transport.create(keyring, transportDelegate)
        // await transport.connect()

        // const softReset = new SoftReset()
        // transport.call(MessageType.MESSAGETYPE_SOFTRESET, softReset)

        await transportDelegate.connect()


        let wallet = await keepkeyAdapter.pairDevice(device.serialNumber, true) as KeepKeyHDWallet;
        if (wallet) {
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