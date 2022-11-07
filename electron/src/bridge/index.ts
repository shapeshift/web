import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { Server } from 'http'
import { ipcMain, app } from 'electron'
import { db } from '../db'
import { RegisterRoutes } from './routes/routes'
import { windows } from '../main'
import { IpcQueueItem } from './types'
import {  KKStateController } from './kk-state-controller'


const queueIpcEvent = (eventName: string, args: any) => {
    if (!renderListenersReady || !windows?.mainWindow || windows.mainWindow.isDestroyed()) {
        return ipcQueue.push({ eventName, args })
    }
    else {
        return windows.mainWindow.webContents.send(eventName, args)
    }
}

export const kkStateController = new KKStateController(queueIpcEvent)

import { downloadFirmware, getLatestFirmwareData, loadFirmware } from './kk-state-controller/firmwareUtils'
import { createAndUpdateTray } from '../tray'

//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")

export let server: Server
export let bridgeRunning = false

export let bridgeClosing = false

let ipcQueue = new Array<IpcQueueItem>()

let renderListenersReady = false

export const start_bridge = async (port?: number) => {
    if (bridgeRunning) return

    // web render thread has indicated it is ready to receive ipc messages
    // send any that have queued since then
    ipcMain.on('renderListenersReady', async () => {
        renderListenersReady = true
        ipcQueue.forEach((item, idx) => {
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send(item.eventName, item.args)
            ipcQueue.splice(idx, 1);
        })
    })
    let API_PORT = port || 1646

    // send paired apps when requested
    ipcMain.on('@bridge/paired-apps', () => {
        db.find({ type: 'service' }, (err, docs) => {
            queueIpcEvent('@bridge/paired-apps', docs)
        })
    })

    // used only for implicitly pairing the KeepKey web app
    ipcMain.on(`@bridge/add-service`, (event, data) => {
        db.insert({
            type: 'service',
            isKeepKeyDesktop: true,
            addedOn: Date.now(),
            ...data
        })
    })

    // used for unpairing apps
    ipcMain.on(`@bridge/remove-service`, (event, data) => {
        db.remove({ ...data })
    })

    ipcMain.on('@keepkey/update-firmware', async event => {
        let result = await getLatestFirmwareData()
        let firmware = await downloadFirmware(result.firmware.url)
        if (!firmware) throw Error("Failed to load firmware from url!")
        await loadFirmware(kkStateController.wallet, firmware)
        event.sender.send('onCompleteFirmwareUpload', {
            bootloader: true,
            success: true
        })
        app.quit()
        app.relaunch();
    })

    ipcMain.on('@keepkey/update-bootloader', async event => {
        let result = await getLatestFirmwareData()
        let firmware = await downloadFirmware(result.bootloader.url)
        await loadFirmware(kkStateController.wallet, firmware)
        event.sender.send('onCompleteBootloaderUpload', {
            bootloader: true,
            success: true
        })
    })

    const appExpress = express()
    appExpress.use(cors())
    appExpress.use(bodyParser.urlencoded({ extended: true }))
    appExpress.use(bodyParser.json())

    appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    //swagger.json
    appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

    RegisterRoutes(appExpress);

    await new Promise( (resolve) =>  server = appExpress.listen(API_PORT, () => resolve(true)))
    log.info(`server started at http://localhost:${API_PORT}`)

    try {
        await kkStateController.syncState()
    } catch (e: any) {
        if (e.toString().includes('claimInterface error')) {
            windows?.splash?.webContents.send("@update/errorClaimed")
            await new Promise( () => 0 )
        } else {
            windows?.splash?.webContents.send("@update/errorReset")
            await new Promise( () => 0 )
        }
    }
}

export const stop_bridge = async () => {
    if(bridgeClosing) return false
    bridgeClosing = true
    await new Promise((resolve) => {
        createAndUpdateTray()
        server.close(async () => {
            await kkStateController.transport?.disconnect()
            bridgeRunning = false
            bridgeClosing = false
            createAndUpdateTray()
            resolve(true)
        })
    })
    return true
}
