import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Device } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Server } from 'http'
import { ipcMain } from 'electron'
import { updateMenu } from '../tray'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { getDevice } from '../wallet'
import { windows } from '../main'
import Hardware from "@keepkey/keepkey-hardware-hid"
import {set_out_of_date_bootloader} from "../state";

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: true }))
appExpress.use(bodyParser.json())

//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server


export let bridgeRunning = false


/*
 
  KeepKey Status codes
 
  keepkey.STATE : status
  ---------------
     -1 : error
      0 : preInit
      1 : no devices
      2 : Bootloader mode
      3 : Bootloader out of date
      4 : updating bootloader
      5 : Firmware out of date
      6 : updating firmware
      7 : device connected
      8 : bridge online

 */

export const STATE_ENGINE = {
    "error" : -1,
    "preInit" : 0,
    "no devices" : 1,
    "Bootloader mode" : 2,
    "Bootloader out of date" : 3,
    "updating bootloader" : 4,
    "Firmware out of date" : 5,
    "updating firmware" : 6,
    "device connected" : 7,
    "bridge online" : 8
}

export const STATES = [
    "preInit",
    "no devices",
    "Bootloader mode",
    "Bootloader out of date",
    "updating bootloader",
    "Firmware out of date",
    "updating firmware",
    "device connected",
    "bridge online"
]

export const keepkey: {
    STATE: number,
    STATUS: string,
    device: Device | null,
    transport: TransportDelegate | null,
    keyring: Keyring | null,
    wallet: KeepKeyHDWallet | null
} = {
    STATE: 0,
    STATUS: 'preInit',
    device: null,
    transport: null,
    keyring: null,
    wallet: null
}

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
}

const base64toHEX = (base64) => {
    var raw = atob(base64);
    var HEX = '';

    for (let i = 0; i < raw.length; i++ ) {
        var _hex = raw.charCodeAt(i).toString(16)

        HEX += (_hex.length==2?_hex:'0'+_hex);
    }

    return HEX
}

export const start_bridge = (port?: number) => new Promise<void>(async (resolve, reject) => {
    let tag = " | start_bridge | "
    try {

        let API_PORT = port || 1646

        // send paired apps when requested
        ipcMain.on('@bridge/paired-apps', (event) => {
            db.find({ type: 'service' }, (err, docs) => {
                windows.mainWindow?.webContents.send('@bridge/paired-apps', docs)
            })
        })

        // used only for implicitly pairing the KeepKey web app
        ipcMain.on(`@bridge/add-service`, (event, data) => {
            db.insert({
                type: 'service',
                addedOn: Date.now(),
                ...data
            })
        })

        // used for unpairing apps
        ipcMain.on(`@bridge/remove-service`, (event, data) => {
            db.remove({ ...data })
        })

        appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        //swagger.json
        appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

        RegisterRoutes(appExpress);

        //port
        try {
            log.info(tag, "starting server! **** ")
            server = appExpress.listen(API_PORT, () => {
                windows.mainWindow?.webContents.send('playSound', { sound: 'success' })
                log.info(`server started at http://localhost:${API_PORT}`)
                windows?.mainWindow?.webContents.send('closeHardwareError', { })
                // keepkey.STATE = 3
                // keepkey.STATUS = 'bridge online'
                // windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
                // windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
                updateMenu(keepkey.STATE)
            })
        } catch (e) {
            keepkey.STATE = -1
            keepkey.STATUS = 'bridge error'
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
            updateMenu(keepkey.STATE)
            log.info('e: ', e)
        }

        bridgeRunning = true

        try {
            keepkey.keyring = new Keyring()
            const device = await getDevice(keepkey.keyring)
            log.info(tag, "device: ", device)
            //@ts-ignore
            log.info(tag, "device.features.bootloaderHash: ", device?.wallet?.features?.bootloaderHash)

            //verify bootloader
            //@ts-ignore
            const decodedHash = base64toHEX(device?.wallet?.features?.bootloaderHash)
            log.info(tag, "decodedHash: ", decodedHash)
            let bootloaderVersion = bootloaderHashToVersion[decodedHash]
            log.info(tag, "*bootloaderVersion: ", bootloaderVersion)

            let latestFirmware = await Hardware.getLatestFirmwareData()
            log.info(tag, "latestFirmware: ", latestFirmware)
            log.info(tag, "latestFirmware.bootloader.version: ", latestFirmware.bootloader.version)

            //if bootloader needs update
            if (bootloaderVersion && bootloaderVersion !== latestFirmware.bootloader.version) {
                log.info("Out of date bootloader!")
                windows?.mainWindow?.webContents.send('openBootloaderUpdate', { })
                //@ts-ignore
                await set_out_of_date_bootloader(device?.wallet?.features)
            }

            if (device instanceof Error) {
                console.log('wallet instance of error', device)
                return resolve()
            }
            resolve()
            keepkey.device = device.device
            keepkey.wallet = device.wallet
            keepkey.transport = device.transport
        } catch (e) {
            resolve()
            console.log('unable to get device', e)
            keepkey.STATE = 1
            keepkey.STATUS = `no devices`
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
            return
        }

        if (keepkey.device) {
            if (!keepkey.transport) {
                console.log('unable to get transport')
                return
            }
        } else {
            log.info('Can not start! waiting for device connect')
        }


        const device = await getDevice(keepkey.keyring)

        if (device instanceof Error) {
            console.log('wallet instance of error', device)
            return
        }
        keepkey.wallet = device.wallet

        resolve()

    } catch (e) {
        log.error(e)
    }
})

export const stop_bridge = () => new Promise<void>((resolve, reject) => {
    try {
        log.info('server: ', server)
        server.close(() => {
            log.info('Closed out remaining connections')
            keepkey.STATE = 2
            keepkey.STATUS = 'device connected'
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
            updateMenu(keepkey.STATE)
        })
        bridgeRunning = false
        resolve()
    } catch (e) {
        log.error(e)
        reject()
    }
})
