import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Device } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { getLatestFirmwareData } from './firmwareUtils';
import { initializeWallet } from './walletUtils'
import { usb } from 'usb';
import log from 'electron-log'

// possible states
export const UPDATE_BOOTLOADER = 'updateBootloader'
export const UPDATE_FIRMWARE = 'updateFirmware'
export const NEEDS_INITIALIZE = 'needsInitialize'
export const CONNECTED = 'connected'
export const HARDWARE_ERROR =  'hardwareError'
export const DISCONNECTED =  'disconnected'
export const PLUGIN =  'plugin'

/**
 * Keeps track of the last known state of the keepkey
 * sends ipc events to the web renderer on state change
 */
export class KKStateController {
    public keyring: Keyring
    public device?: Device
    public wallet?: KeepKeyHDWallet
    public transport?: TransportDelegate

    public lastState?: string
    public lastData?: any

    public onStateChange: any

    constructor(onStateChange: any) {
        log.info("KKStateController constructor")
        this.keyring = new Keyring()
        this.onStateChange = onStateChange

        usb.on('attach', async (e) => {
            log.info("KKStateController attach")
            if(e.deviceDescriptor.idVendor !== 11044) return
            this.updateState(PLUGIN, {})
            await this.syncState()
        })
        usb.on('detach', async (e) => {
            log.info("KKStateController detach")
            if(e.deviceDescriptor.idVendor !== 11044) return
            this.updateState(DISCONNECTED, {})
        })
    }

    private updateState = async (newState: string, newData: any) => {
        // TODO event is a bad name, change it to data everywhere its used
        this.onStateChange(newState, { event: newData })
        this.lastState = newState
        this.lastData = newData
    }

    public syncState = async () => {
        log.info("KKStateController syncState")
        const latestFirmware = await getLatestFirmwareData()
        const resultInit = await initializeWallet(this)
        log.info("KKStateController resultInit: ",resultInit)
        if(resultInit.unplugged){
            log.info("KKStateController resultInit.unplugged")
            this.updateState(DISCONNECTED, {})
        } else if (!resultInit || !resultInit.success || resultInit.error){
            log.info("KKStateController HARDWARE_ERROR")
            this.updateState(HARDWARE_ERROR, { error: resultInit?.error })
        } else if (resultInit.bootloaderVersion !== latestFirmware.bootloader.version){
            log.info("KKStateController UPDATE_BOOTLOADER")
            this.updateState(UPDATE_BOOTLOADER, {
                bootloaderUpdateNeeded: true,
                firmware: resultInit.firmwareVersion,
                bootloader: resultInit.bootloaderVersion,
                recommendedBootloader: latestFirmware.bootloader.version,
                recommendedFirmware: latestFirmware.firmware.version,
                bootloaderMode: resultInit.bootloaderMode
            })
        } else if (resultInit.firmwareVersion !== latestFirmware.firmware.version) {
            log.info("KKStateController UPDATE_FIRMWARE")
            log.info("KKStateController UPDATE_FIRMWARE resultInit: ",resultInit)
            this.updateState(UPDATE_FIRMWARE, {
                firmwareUpdateNeededNotBootloader: true,
                firmware: !!resultInit.firmwareVersion ? resultInit.firmwareVersion : 'unknown',
                bootloader: resultInit.bootloaderVersion,
                recommendedBootloader: latestFirmware.bootloader.version,
                recommendedFirmware: latestFirmware.firmware.version,
                bootloaderMode: resultInit.bootloaderMode
            })
        } else if (!resultInit?.features?.initialized) {
            log.info("KKStateController NEEDS_INITIALIZE")
            this.updateState(NEEDS_INITIALIZE, {
                needsInitialize: true
            })
        } else {
            log.info("KKStateController CONNECTED")
            this.updateState(CONNECTED, {
                ready: true
            })
        }
    }
}
