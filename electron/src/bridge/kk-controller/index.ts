import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Device } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { usb } from 'usb'
import EventEmitter from 'events';
import { getLatestFirmwareData } from './firmwareUtils';
import { initializeWallet } from './walletUtils' 

export class KKController {
    public keyring: Keyring
    public device?: Device
    public wallet?: KeepKeyHDWallet
    public events: EventEmitter
    public transport?: TransportDelegate

    constructor() {
        this.keyring = new Keyring()
        this.events = new EventEmitter();
    }

    init = async () => {
        await this.initializeDevice()
        usb.on('attach', async () => {
            await this.initializeDevice()
        })
        usb.on('detach', async () => {
            this.wallet = undefined
            this.keyring = new Keyring()
        })
    }

    initializeDevice = async () => {
        const latestFirmware = await getLatestFirmwareData()
        const resultInit = await initializeWallet(this)

        if(!resultInit || !resultInit.success || resultInit.error) {
            this.events.emit('error', {
                error: resultInit?.error
            })
        } else if (resultInit.bootloaderVersion !== latestFirmware.bootloader.version) {
            this.events.emit('logs', {
                    bootloaderUpdateNeeded: true,
                    firmware: resultInit.firmwareVersion,
                    bootloader: resultInit.bootloaderVersion,
                    recommendedBootloader: latestFirmware.bootloader.version,
                    recommendedFirmware: latestFirmware.firmware.version,
                    bootloaderMode: resultInit.bootloaderMode
                })
        } else if (resultInit.firmwareVersion !== latestFirmware.firmware.version) {
            this.events.emit('logs', {
                firmwareUpdateNeededNotBootloader: true,
                firmware: !!resultInit.firmwareVersion ? resultInit.firmwareVersion : 'v1.0.1',
                bootloader: resultInit.bootloaderVersion,
                recommendedBootloader: latestFirmware.bootloader.version,
                recommendedFirmware: latestFirmware.firmware.version,
                bootloaderMode: resultInit.bootloaderMode
            })
        } else if(!resultInit?.features?.initialized) {
            this.events.emit('logs', {
                needsInitialize: true
            })
        } else {
            this.events.emit('logs', {
                ready: true
            })
        }
    }

    closeDevice = async () => {
        await this.wallet?.disconnect()
    }
}
