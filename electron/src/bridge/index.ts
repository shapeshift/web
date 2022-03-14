import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Device, NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Server } from 'http'
import { ipcMain } from 'electron'
import { updateMenu } from '../tray'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { KeepKeyHDWallet, TransportDelegate } from '@shapeshiftoss/hdwallet-keepkey'
import { getDevice } from '../wallet'
import { windows } from '../main'

const appExpress = express()
appExpress.use(cors())
appExpress.use(bodyParser.urlencoded({ extended: true }))
appExpress.use(bodyParser.json())

//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")
const adapter = NodeWebUSBKeepKeyAdapter.useKeyring(new Keyring())


let server: Server


export let bridgeRunning = false

/*
 
  KeepKey Status codes
 
  keepkey.STATE : status
  ---------------
     -1 : error
      0 : preInit
      1 : no devices
      2 : device connected
      3 : bridge online
      4 : bootloader out of date
      5 : firmware out of date
 */

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


export const start_bridge = async function () {
    let tag = " | start_bridge | "
    try {
        try {
            keepkey.device = await adapter.getDevice()
            log.info(tag, "device: ", keepkey.device)
        } catch (e) {
            keepkey.STATE = 1
            keepkey.STATUS = `no devices`
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
            return
        }

        if (keepkey.device) {
            keepkey.transport = await adapter.getTransportDelegate(keepkey.device)
            if (!keepkey.transport) return
            await keepkey.transport.connect?.()
            log.info(tag, "transport: ", keepkey.transport)

            keepkey.STATE = 2
            keepkey.STATUS = 'keepkey connected'
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
        } else {
            log.info('Can not start! waiting for device connect')
        }

        keepkey.keyring = new Keyring()
        const wallet = await getDevice(keepkey.keyring)

        if (wallet instanceof Error) return
        keepkey.wallet = wallet

        let API_PORT = process.env['API_PORT_BRIDGE'] || '1646'

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
            log.info(tag,"starting server! **** ")
            server = appExpress.listen(API_PORT, () => {
                windows.mainWindow?.webContents.send('playSound', { sound: 'success' })
                log.info(`server started at http://localhost:${API_PORT}`)
                keepkey.STATE = 3
                keepkey.STATUS = 'bridge online'
                windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
                windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
                updateMenu(keepkey.STATE)
            })
        } catch (e) {
            windows.mainWindow?.webContents.send('playSound', { sound: 'fail' })
            keepkey.STATE = -1
            keepkey.STATUS = 'bridge error'
            windows.mainWindow?.webContents.send('setKeepKeyState', { state: keepkey.STATE })
            windows.mainWindow?.webContents.send('setKeepKeyStatus', { status: keepkey.STATUS })
            updateMenu(keepkey.STATE)
            log.info('e: ', e)
        }

        bridgeRunning = true

    } catch (e) {
        log.error(e)
    }
}

export const stop_bridge = async (event) => {
    try {
        windows.mainWindow?.webContents.send('playSound', { sound: 'fail' })
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
    } catch (e) {
        log.error(e)
    }
}
