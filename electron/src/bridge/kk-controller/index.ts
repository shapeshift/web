/*
      Keepkey Hardware Module
 */

const TAG = " | keepkey-hardware-controller | ";

const log = require("@pioneer-platform/loggerdog")()
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Device, NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
const { HIDKeepKeyAdapter } = require('@bithighlander/hdwallet-keepkey-nodehid')
import { usb, findByIds } from 'usb'
import EventEmitter from 'events';
import { AllFirmwareAndBootloaderData, ControllerConfig, BasicWallet, LatestFirmwareAndBootloaderData, WebusbWallet, GenericError } from './types';
const request = require('request-promise')

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
    public state: number | null
    public status: string
    public events: EventEmitter
    public transport?: TransportDelegate
    private FIRMWARE_BASE_URL: string;

    constructor(config: ControllerConfig) {
        this.status = "unknown"
        this.FIRMWARE_BASE_URL = config.FIRMWARE_BASE_URL || "https://raw.githubusercontent.com/keepkey/keepkey-updater/master/firmware/"
        this.state = null
        this.deviceReady = false
        this.keyring = new Keyring()
        this.events = new EventEmitter();
    }

    init = async () => {
        let tag = TAG + " | init_events | "
        try {
            log.debug(tag, "init controller")
            this.getDeviceStatus()

            // console.log("usb: ", usb)

            usb.on('attach', (device) => {
                try {
                    log.debug('attach device: ', device)
                    // @ts-ignore
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
        } catch (e) {
            log.error(tag, e)
            throw e
        }
    }
    startController = async (): Promise<any | Error> => {
        let tag = TAG + " | startController | "
        try {
            log.debug(tag, "checkpoint")
            if (!this.deviceReady) await this.createWebUsbWallet()
            log.debug(tag, "checkpoint2")
            //@ts-ignore
            log.debug(tag, "device.features.bootloaderHash: ", this.wallet?.features?.bootloaderHash)

            //verify bootloader
            //@ts-ignore
            const features = this.wallet?.features
            log.debug(tag, "features: ", features)
            const decodedHash = base64toHEX(this.wallet?.features?.bootloaderHash)
            log.debug(tag, "decodedHash: ", decodedHash)
            // @ts-ignore
            let bootloaderVersion = bootloaderHashToVersion[decodedHash]
            log.debug(tag, "*bootloaderVersion: ", bootloaderVersion)

            let latestFirmware = await this.getLatestFirmwareData()
            log.debug(tag, "latestFirmware: ", latestFirmware)
            log.debug(tag, "latestFirmware.bootloader.version: ", latestFirmware.bootloader.version)

            //if bootloader needs update
            if (bootloaderVersion && bootloaderVersion !== latestFirmware.bootloader.version) {
                log.debug("Out of date bootloader!")
                this.updateState(3)
            } else if (features?.bootloaderMode) {
                this.updateState(2)
            } else {
                //TODO detect init?
                log.debug(tag, "features: ", features)
                if (features && !features.initialized) {
                    this.updateState(5)
                } else {
                    this.updateState(6)
                }
            }
        } catch (e) {
            // @ts-ignore
            log.error(tag, "*** e: ", e.toString())
        }
    }
    updateState = async (newState: number, error?: string): Promise<boolean | Error> => {
        let tag = TAG + " | updateState | "
        try {
            log.debug(tag, "newState: ", newState)
            let prevState = this.state
            if (error) {
                this.state = newState
                this.status = "Error"
                let prompt
                let errorDescription
                let code
                //classify error
                if (error.indexOf("cannot open device with path")) {
                    //fix, reconnect device
                    prompt = "please restart device"
                    errorDescription = "Device not found"
                    code = 11
                } else if (error.indexOf("Pact is not defined")) {
                    //fix, reconnect device
                    prompt = "please restart device"
                    errorDescription = "Device not responding"
                    code = 12
                } else if (error.indexOf("Cannot write to hid device")) {
                    prompt = "please restart device"
                    errorDescription = "Device refusing communication"
                    code = 13
                } else if (error.indexOf("Can't close device with a pending request")) {
                    prompt = "please restart device"
                    errorDescription = "Device was interrupted while communication"
                    code = 14
                } else {
                    prompt = "please restart device"
                    errorDescription = "unknown error"
                    code = 0
                }

                this.events.emit('error', {
                    prompt,
                    errorDescription,
                    errorCode: code,
                    error,
                    state: this.state,
                    status: this.status
                })
            } else {
                //get current state
                if (newState !== this.state) {
                    //if state change
                    this.state = newState
                    this.status = STATUS_MSG[newState]
                    //throw event
                }
            }
            this.events.emit('state', {
                prevState,
                state: this.state,
                status: this.status,
                deviceId: this.wallet ? await this.wallet.getDeviceID() : ''
            })
            return true
        } catch (e) {
            log.error("failed to update state: ", e)
            return false
        }
    }
    getDeviceStatus = async (isDisconnect?: boolean): Promise<boolean | Error> => {
        let tag = TAG + " | getDeviceStatus | "
        try {
            //primart Detect
            let allDevices = usb.getDeviceList()
            log.debug(tag, "allDevices: ", allDevices.length)
            let deviceDetected = false
            let resultWebUsb = findByIds(11044, 2)
            if (resultWebUsb) {
                log.debug(tag, "KeepKey connected in webusb!")
                deviceDetected = true
                if (!this.deviceReady) this.startController()
            }
            let resultPreWebUsb = findByIds(11044, 1)
            if (resultPreWebUsb) {
                log.debug(tag, "update required! (resultPreWebUsb)")
                deviceDetected = true
            }
            if (!deviceDetected) {
                log.debug(tag, "No devices connected")
                //reset wallets to prevent wrong data
                this.deviceReady = false
                this.wallet = undefined
                this.keyring = new Keyring()
                this.updateState(0)
            } else {
                log.debug(tag, "resultWebUsb: ", resultWebUsb)
                log.debug(tag, "resultPreWebUsb: ", resultPreWebUsb)
            }

            //HID detect
            let latestFirmware = await this.getLatestFirmwareData()
            log.debug(tag, "latestFirmware: ", latestFirmware)

            //init
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
                    //updater mode
                    this.updateState(2)
                }

                if (resultInit && !resultInit.success && resultInit.prompt === 'No wallet in the keyring') {
                    //updater mode
                    this.updateState(0)
                }

                if (resultInit && resultInit.success && resultInit.features) {
                    log.debug(tag, "resultInit: ", resultInit)
                    log.debug(tag, "resultInit.bootloaderVersion: ", resultInit.bootloaderVersion)
                    log.debug(tag, "resultInit.firmwareVersion: ", resultInit.firmwareVersion)

                    //if new
                    if (resultInit.bootloaderVersion === "v1.0.3" && resultInit.firmwareVersion === "v4.0.0") {
                        this.updateState(1)
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
                    this.updateState(-1, resultInit.error.toString())
                }

                log.debug(tag, "resultInit: ", resultInit)
            }
            return true
        } catch (e) {
            //log.error(tag,"*** e: ",e.toString())
            // @ts-ignore
            log.debug("failed to get device: ", e.message)
        }
        return false
    }
    createWebUsbWallet = () => new Promise<WebusbWallet | GenericError>(async (resolve, reject) => {
        let tag = TAG + " | createWebUsbWallet | "
        try {
            this.deviceReady = false
            log.debug(tag, "checkpoint")
            // await this.resetDevice()
            const keepkeyAdapter = NodeWebUSBKeepKeyAdapter.useKeyring(this.keyring);
            this.device = await keepkeyAdapter.getDevice()
            if (!this.device) return resolve({ success: false, error: 'Unable to get device!' })
            const transport = await keepkeyAdapter.getTransportDelegate(this.device)
            if (!transport) return resolve({ success: false, error: 'Unable to connect transport!' })
            this.transport = transport
            await this.transport.connect()

            this.wallet = await keepkeyAdapter.pairDevice(this.device.serialNumber, true) as KeepKeyHDWallet;
            if (this.wallet) {
                log.debug(tag, "Device found!")
            }

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
        } catch (e) {
            //log.error(tag,"*** e: ",e.toString())
            // @ts-ignore
            log.error("failed to get device: ", e.message)
            // @ts-ignore
            if (e.message.indexOf("Firmware 6.1.0 or later is required") >= 0) {
                //ignore
                resolve({ success: false, error: "Firmware 6.1.0 or later is required" })
            } else {
                // @ts-ignore
                this.updateState(-1, e.message.toString())
            }
        }
    })

    createHidWallet = () => new Promise<BasicWallet>(async (resolve, reject) => {

        let tag = TAG + " | createHidWallet | "
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
            // @ts-ignore
            if (this.wallet.features && this.wallet.features.bootloaderMode) {
                // @ts-ignore
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
                // @ts-ignore
                let bootloaderVersion = bootloaderHashToVersion[decodedHash]
                return resolve({
                    success: true,
                    bootloaderMode: false,
                    bootloaderVersion,
                    firmwareVersion: `v${majorVersion}.${minorVersion}.${patchVersion}`,
                    features,
                })
            }

        } catch (e) {
            return {
                success: false,
                // @ts-ignore
                error: e.toString(),
            }
        }
    })
    downloadFirmware = async (path: string) => {
        try {

            let firmware = await request({
                url: this.FIRMWARE_BASE_URL + path,
                headers: {
                    accept: 'application/octet-stream',
                },
                encoding: null
            })

            //TODO validate
            //     const firmwareIsValid = !!body
            //         && body.slice(0x0000, 0x0004).toString() === 'KPKY' // check for 'magic' bytes
            //         && body.slice(0x0004, 0x0008).readUInt32LE() === body.length - 256 // check firmware length - metadata
            //         && body.slice(0x000B, 0x000C).readUInt8() & 0x01 // check that flag is not set to wipe device
            //     if(!firmwareIsValid) throw Error('Fetched data is not valid firmware')

            return firmware
        } catch (e) {
            console.error(e)
        }
    }
    loadFirmware = async (firmware) => {
        try {
            if (!this.wallet) return
            let resultWipe = await this.wallet.firmwareErase()
            log.debug("resultWipe: ", resultWipe)

            const uploadResult = await this.wallet.firmwareUpload(firmware)
            return uploadResult
        } catch (e) {
            log.error("e: ", e)
        }
    }
    getAllFirmwareData = () => new Promise<AllFirmwareAndBootloaderData>((resolve, reject) => {
        request(`${this.FIRMWARE_BASE_URL}releases.json`, (err: any, response, body: any) => {
            if (err) return reject(err)
            resolve(JSON.parse(body))
        })

    })
    getLatestFirmwareData = () => new Promise<LatestFirmwareAndBootloaderData>(async (resolve, reject) => {
        const allFirmwareData = await this.getAllFirmwareData()
        resolve(allFirmwareData.latest)
    })
    resetDevice = () => new Promise<void>((resolve, reject) => {
        const keepkey = findByIds(11044, 2)
        if (keepkey) {
            keepkey.open()
            keepkey.reset(() => { resolve() })
        }
    })
}
