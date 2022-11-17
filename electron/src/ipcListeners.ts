import { app, ipcMain } from "electron"
import { bridgeLogger, db, ipcQueue, isWalletBridgeRunning, kkStateController, setRenderListenersReady, windows } from "./globalState"
import isDev from 'electron-is-dev'
import {
  downloadFirmware,
  getLatestFirmwareData,
  loadFirmware,
} from './helpers/kk-state-controller/firmwareUtils'
import * as path from 'path'
import { queueIpcEvent } from './helpers/utils'
import log from 'electron-log'

export const startIpcListeners = () => {
    ipcMain.setMaxListeners(15)

    ipcMain.on('@app/restart', (event, data) => {
        app.relaunch();
        app.exit();
    })

    ipcMain.on('@app/exit', (event, data) => {
        app.exit();
    })

    ipcMain.on('@app/get-asset-url', (event, data) => {
        const assetUrl = !isDev ? `file://${path.resolve(__dirname, "../../build/", data.assetPath)}` : data.assetPath
        event.sender.send(`@app/get-asset-url-${data.nonce}`, { nonce: data.nonce, assetUrl })
    })

    ipcMain.on("@app/version", (event, _data) => {
        event.sender.send("@app/version", app.getVersion());
    })

    ipcMain.on("@app/pairings", (_event, _data) => {
        db.find({ type: 'pairing' }, (err, docs) => {
            if (windows.mainWindow && !windows.mainWindow.isDestroyed())
                windows.mainWindow.webContents.send("@app/pairings", docs)
        })
    })

    ipcMain.on("@walletconnect/pairing", (event, data) => {
        db.findOne({
            type: 'pairing', serviceName: data.serviceName,
            serviceHomePage: data.serviceHomePage,
            pairingType: 'walletconnect'
        }, (err, doc) => {
            if (doc) {
                db.update({
                    type: 'pairing', serviceName: data.serviceName,
                    serviceHomePage: data.serviceHomePage,
                    pairingType: 'walletconnect'
                }, {
                    type: 'pairing',
                    addedOn: Date.now(),
                    serviceName: data.serviceName,
                    serviceImageUrl: data.serviceImageUrl,
                    serviceHomePage: data.serviceHomePage,
                    pairingType: 'walletconnect'
                })
            } else {
                db.insert({
                    type: 'pairing',
                    addedOn: Date.now(),
                    serviceName: data.serviceName,
                    serviceImageUrl: data.serviceImageUrl,
                    serviceHomePage: data.serviceHomePage,
                    pairingType: 'walletconnect'
                })
            }
        })
    })

    ipcMain.on("@bridge/service-details", (event, serviceKey) => {
        db.findOne({
            type: 'service', serviceKey
        }, (err, doc) => {
            if(!doc) return
            const logs = bridgeLogger.fetchLogs(serviceKey)
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send("@bridge/service-details", {
                app: doc,
                logs 
            })
        })
    })

    ipcMain.on('@bridge/connected', (event, serviceKey) => {
        if (windows.mainWindow && !windows.mainWindow.isDestroyed())
          windows.mainWindow.webContents.send('@bridge/connected', isWalletBridgeRunning())
      })

    ipcMain.on("@bridge/service-name", (event, serviceKey) => {
        db.findOne({
            type: 'service', serviceKey
        }, (err, doc) => {
            if(!doc) return
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send("@bridge/service-name", doc.serviceName)
        })
    })

    // web render thread has indicated it is ready to receive ipc messages
    // send any that have queued since then
    ipcMain.on('renderListenersReady', async () => {
        log.info('renderListenersReady')
        setRenderListenersReady(true)
        ipcQueue.forEach((item) => {
            log.info('ipc event called from queue', item)
            if (windows.mainWindow && !windows.mainWindow.isDestroyed()) windows.mainWindow.webContents.send(item.eventName, item.args)
        })
        ipcQueue.length = 0
    })

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
}
