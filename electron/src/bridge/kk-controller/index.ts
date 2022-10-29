const TAG = " | kk-controller | ";

const log = require("@pioneer-platform/loggerdog")()
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Device, NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
const { HIDKeepKeyAdapter } = require('@bithighlander/hdwallet-keepkey-nodehid')
import { usb, findByIds } from 'usb'
import EventEmitter from 'events';
import { ControllerConfig, BasicWallet, WebusbWallet, GenericError } from './types';
import { getLatestFirmwareData } from './firmwareUtils';

const bootloaderHashToVersion = {
    '6397c446f6b9002a8b150bf4b9b4e0bb66800ed099b881ca49700139b0559f10': 'v1.0.0',
    'f13ce228c0bb2bdbc56bdcb5f4569367f8e3011074ccc63331348deb498f2d8f': 'v1.0.0',
    'd544b5e06b0c355d68b868ac7580e9bab2d224a1e2440881cc1bca2b816752d5': 'v1.0.1',
    'ec618836f86423dbd3114c37d6e3e4ffdfb87d9e4c6199cf3e163a67b27498a2': 'v1.0.1',
    'cd702b91028a2cfa55af43d3407ba0f6f752a4a2be0583a172983b303ab1032e': 'v1.0.2',
    'bcafb38cd0fbd6e2bdbea89fb90235559fdda360765b74e4a8758b4eff2d4921': 'v1.0.2',
    'cb222548a39ff6cbe2ae2f02c8d431c9ae0df850f814444911f521b95ab02f4c': 'v1.0.3',
    '917d1952260c9b89f3a96bea07eea4074afdcc0e8cdd5d064e36868bdd68ba7d': 'v1.0.3',
    '6465bc505586700a8111c4bf7db6f40af73e720f9e488d20db56135e5a690c4f': 'v1.0.3',
    'db4bc389335e876e942ae3b12558cecd202b745903e79b34dd2c32532708860e': 'v1.0.3',
    '2e38950143cf350345a6ddada4c0c4f21eb2ed337309f39c5dbc70b6c091ae00': 'v1.0.3',
    '83d14cb6c7c48af2a83bc326353ee6b9abdd74cfe47ba567de1cb564da65e8e9': 'v1.0.3',
    '770b30aaa0be884ee8621859f5d055437f894a5c9c7ca22635e7024e059857b7': 'v1.0.4',
    'fc4e5c4dc2e5127b6814a3f69424c936f1dc241d1daf2c5a2d8f0728eb69d20d': 'v1.0.4',
    'e45f587fb07533d832548402d0e71d8e8234881da54d86c4b699c28a6482b0ee': 'v1.1.0',
    '9bf1580d1b21250f922b68794cdadd6c8e166ae5b15ce160a42f8c44a2f05936': 'v2.0.0',
    'e1ad2667d1924e4ddbeb623bd6939e94114d8471b84f8fb056e0c9abf0c4e4f4': "v2.1.0",
    'a3f8c745ff33cd92a7e95d37c76c65523d258a70352ea44a232038ec4ec38dea': "v2.1.1",
    '3b97596ed612aa29a74a7f51f33ea85fd6e0cfe7340dfbb96f0c17077b363498': "v2.1.2",
    'e6685ab14844d0a381d658d77e13d6145fe7ae80469e5a5360210ae9c3447a77': "v2.1.3",
    'fe98454e7ebd4aef4a6db5bd4c60f52cf3f58b974283a7c1e1fcc5fea02cf3eb': "v2.1.4"
}

const base64toHEX = (base64: any) => {
    var raw = Buffer.from(base64, 'base64').toString('binary')
    var HEX = '';

    for (let i = 0; i < raw.length; i++) {
        var _hex = raw.charCodeAt(i).toString(16)

        HEX += (_hex.length == 2 ? _hex : '0' + _hex);
    }
    return HEX
}

export const STATUS_MSG = [
    "no devices",
    "new device",
    "Bootloader mode",
    "updating bootloader",
    "updating firmware",
    "needs initialization",
    "device connected",
    "bridge online"
]

export class KKController {
    public deviceReady: boolean
    public keyring: Keyring
    public device?: Device
    public wallet?: KeepKeyHDWallet
    public events: EventEmitter
    public transport?: TransportDelegate

    constructor(config: ControllerConfig) {
        this.deviceReady = false
        this.keyring = new Keyring()
        this.events = new EventEmitter();
    }

    init = async () => {
        this.getDeviceStatus()

        usb.on('attach', (device) => {
            try {
                log.debug('attach device: ', device)
                this.getDeviceStatus()
                if (this.deviceReady) this.startController()
            } catch (e) {
                log.error(e)
            }
        })

        usb.on('detach', (device) => {
            try {
                log.debug('detach device: ', device)
                this.getDeviceStatus(true)
            } catch (e) {
                log.error(e)
            }
        })

        return true
    }
    startController = async (): Promise<any | Error> => {
        let tag = TAG + " | startController | "
        try {

            if (!this.deviceReady) await this.createWebUsbWallet()

            const features = this.wallet?.features

            const decodedHash = base64toHEX(this.wallet?.features?.bootloaderHash)

            let bootloaderVersion = bootloaderHashToVersion[decodedHash]

            let latestFirmware = await getLatestFirmwareData()

            //if bootloader needs update
            if (bootloaderVersion && bootloaderVersion !== latestFirmware.bootloader.version) {
                this.events.emit('logs', {
                    bootloaderUpdateNeeded: true
                })
            } else if (features?.bootloaderMode) {
                this.events.emit('logs', {
                    firmwareUpdateNeededNotBootloader: true
                })
            } else {
                if (features && !features.initialized) {
                    this.events.emit('logs', {
                        needsInitialize: true
                    })
                } else {
                    this.events.emit('logs', {
                        ready: true
                    })
                }
            }
        } catch (e: any) {
            log.error(tag, "*** e: ", e.toString())
        }
    }

    getDeviceStatus = async (isDisconnect?: boolean): Promise<boolean | Error> => {
        let tag = TAG + " | getDeviceStatus | "
        try {
            //primart Detect
            let deviceDetected = false
            let resultWebUsb = findByIds(11044, 2)
            if (resultWebUsb) {
                deviceDetected = true
                if (!this.deviceReady) this.startController()
            }
            let resultPreWebUsb = findByIds(11044, 1)
            if (resultPreWebUsb) {
                deviceDetected = true
            }
            if (!deviceDetected) {
                this.deviceReady = false
                this.wallet = undefined
                this.keyring = new Keyring()

                this.events.emit('error', {
                    error: 'no device detected',
                })
            }

            //HID detect
            let latestFirmware = await getLatestFirmwareData()
            log.debug(tag, "latestFirmware: ", latestFirmware)

            if (!isDisconnect) {
                let resultInit: BasicWallet;

                try {
                    let webUSBResultInit = await this.createWebUsbWallet()
                    if ('success' in webUSBResultInit && !webUSBResultInit.success) {
                        resultInit = await this.createHidWallet()
                    } else {
                        resultInit = {
                            ...(webUSBResultInit as WebusbWallet),
                            success: true
                        }
                    }
                } catch (e) {
                    resultInit = await this.createHidWallet()
                }

                log.debug(tag, "resultInit: ", resultInit)
                if (resultInit && resultInit.success && resultInit.bootloaderMode) {
                    this.events.emit('logs', {
                        firmwareUpdateNeededNotBootloader: true
                    })
                }

                if (resultInit && !resultInit.success && resultInit.prompt === 'No wallet in the keyring') {
                    this.events.emit('error', {
                        error: 'general error',
                    })
                }

                if (resultInit && resultInit.success && resultInit.features) {
                    //if new
                    if (resultInit.bootloaderVersion === "v1.0.3" && resultInit.firmwareVersion === "v4.0.0") {
                        //set new device
                        this.events.emit('logs', {
                            prompt: "New Device Detected",
                            newDevice: true,
                        })
                    }

                    //if bootloader needs update
                    if (resultInit.bootloaderVersion !== latestFirmware.bootloader.version) {
                        this.events.emit('logs', {
                            prompt: "update bootloader",
                            bootloaderUpdateNeeded: true,
                            firmware: resultInit.firmwareVersion,
                            bootloader: resultInit.bootloaderVersion,
                            recommendedBootloader: latestFirmware.bootloader.version,
                            recommendedFirmware: latestFirmware.firmware.version,
                            bootloaderMode: resultInit.bootloaderMode
                        })
                    }

                    //if firmware needs update
                    if (resultInit.firmwareVersion !== latestFirmware.firmware.version && resultInit.bootloaderVersion === latestFirmware.bootloader.version) {
                        this.events.emit('logs', {
                            prompt: "update firmware",
                            firmwareUpdateNeeded: true,
                            firmware: resultInit.firmwareVersion,
                            bootloader: resultInit.bootloaderVersion,
                            recommendedBootloader: latestFirmware.bootloader.version,
                            recommendedFirmware: latestFirmware.firmware.version,
                            bootloaderMode: resultInit.bootloaderMode
                        })
                    }
                }

                if (resultInit && resultInit.error && !isDisconnect) {
                    this.events.emit('error', {
                        error: resultInit.error
                    })
                }

                log.debug(tag, "resultInit: ", resultInit)
            }
            return true
        } catch (e: any) {
            log.debug("failed to get device: ", e.message)
        }
        return false
    }
    createWebUsbWallet = () => new Promise<WebusbWallet | GenericError>(async (resolve, reject) => {
        let tag = TAG + " | createWebUsbWallet | "

        log.debug(tag, "starting")
        try {
            this.deviceReady = false
            const keepkeyAdapter = NodeWebUSBKeepKeyAdapter.useKeyring(this.keyring);
            this.device = await keepkeyAdapter.getDevice()
            if (!this.device) return resolve({ success: false, error: 'Unable to get device!' })
            const transport = await keepkeyAdapter.getTransportDelegate(this.device)
            if (!transport) return resolve({ success: false, error: 'Unable to connect transport!' })
            this.transport = transport
            await this.transport.connect()

            this.wallet = await keepkeyAdapter.pairDevice(this.device.serialNumber, true) as KeepKeyHDWallet;

            let features = await this.wallet.getFeatures()
            const { majorVersion, minorVersion, patchVersion, bootloaderHash } = features
            const versionString = `v${majorVersion}.${minorVersion}.${patchVersion}`

            this.deviceReady = true

            resolve({
                features,
                bootloaderMode: features.bootloaderMode,
                bootloaderVersion: features.bootloaderMode ? versionString : bootloaderHashToVersion[base64toHEX(bootloaderHash)],
                firmwareVersion: features.bootloaderMode ? '' : versionString,
                wallet: this.wallet,
                transport: this.transport,
                device: this.device,
                success: true,
            })
        } catch (e: any) {
            log.error("failed to get device: ", e.message)
            if (e.message.indexOf("Firmware 6.1.0 or later is required") >= 0) {
                resolve({ success: false, error: "Firmware 6.1.0 or later is required" })
            } else {
                this.events.emit('error', {
                    error: e
                })
            }
        }
    })

    createHidWallet = () => new Promise<BasicWallet>(async (resolve, reject) => {
        let tag = TAG + " | createHidWallet | "

        log.debug(tag, "starting")

        try {
            //
            let hidAdapter = await HIDKeepKeyAdapter.useKeyring(this.keyring)
            await hidAdapter.initialize()
            const wallet = this.keyring.get()
            if (!wallet) {
                return {
                    success: false,
                    bootloaderMode: false,
                    prompt: 'No wallet in the keyring'
                }
            }
            this.wallet = wallet as KeepKeyHDWallet
            if (this.wallet.features && this.wallet.features.bootloaderMode) {
                const { majorVersion, minorVersion, patchVersion, bootloaderHash } = this.wallet.features
                // @ts-ignore
                return resolve({
                    success: true,
                    bootloaderMode: true,
                    bootloaderVersion: `v${majorVersion}.${minorVersion}.${patchVersion}`,
                    features: this.wallet.features,
                })
            } else {
                let features = await this.wallet.getFeatures()
                const { majorVersion, minorVersion, patchVersion, bootloaderHash } = features
                const decodedHash = base64toHEX(bootloaderHash)

                let bootloaderVersion = bootloaderHashToVersion[decodedHash]
                return resolve({
                    success: true,
                    bootloaderMode: false,
                    bootloaderVersion,
                    firmwareVersion: `v${majorVersion}.${minorVersion}.${patchVersion}`,
                    features,
                })
            }

        } catch (e: any) {
            return {
                success: false,
                error: e.toString(),
            }
        }
    })
    resetDevice = () => new Promise<void>((resolve, reject) => {
        const keepkey = findByIds(11044, 2)
        if (keepkey) {
            keepkey.open()
            keepkey.reset(() => { resolve() })
        }
    })
}
