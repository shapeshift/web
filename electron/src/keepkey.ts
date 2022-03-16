import {windows} from "./main";

const TAG = ' | KeepKey | '

import { getConfig, updateConfig } from "keepkey-config";

import log from "electron-log";
import usb from "usb";
import { ipcMain } from "electron";
import { shared } from "./shared";

import Hardware from "@keepkey/keepkey-hardware-hid"

ipcMain.on('@keepkey/update-firmware', async event => {
    const tag = TAG + ' | onUpdateFirmware | '
    try {
        let result = await Hardware.getLatestFirmwareData()
        updateConfig({ attemptUpdateFirmware: true })
        let firmware = await Hardware.downloadFirmware(result.firmware.url)
        const updateResponse = await Hardware.loadFirmware(firmware)
        log.info(tag, "updateResponse: ", updateResponse)
        updateConfig({ updatedFirmware: true })
        event.sender.send('onCompleteFirmwareUpload', {
            bootloader: true,
            success: true
        })
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@keepkey/update-bootloader', async event => {
    const tag = TAG + ' | onUpdateBootloader | '
    try {
        log.info(tag, "checkpoint: ")
        let result = await Hardware.getLatestFirmwareData()
        updateConfig({ attemptUpdateBootlder: true })
        let firmware = await Hardware.downloadFirmware(result.bootloader.url)
        const updateResponse = await Hardware.loadFirmware(firmware)
        log.info(tag, "updateResponse: ", updateResponse)
        updateConfig({ updatedBootloader: true })
        event.sender.send('onCompleteBootloaderUpload', {
            bootloader: true,
            success: true
        })
    } catch (e) {
        log.error(tag, e)
    }
})

ipcMain.on('@keepkey/info', async (event, data) => {
    const tag = TAG + ' | onKeepKeyInfo | '
    try {
        shared.KEEPKEY_FEATURES = data
    } catch (e) {
        log.error('e: ', e)
        log.error(tag, e)
    }
})

export const update_keepkey_status = async function () {
    let tag = " | update_keepkey_status | "
    try {
        let config = getConfig()
        //
        let firmwareInfo = await Hardware.getLatestFirmwareData()
        log.info(tag, "firmwareInfo: ", firmwareInfo)
        windows?.mainWindow?.webContents.send('loadKeepKeyFirmwareLatest', { payload: firmwareInfo })

        //init
        let resultInit = await Hardware.init()
        if (resultInit && resultInit.success && resultInit.bootloaderMode) {
            windows?.mainWindow?.webContents.send('setUpdaterMode', { payload: true })
        }
        if (resultInit && resultInit.success && resultInit.wallet) {
            shared.KEEPKEY_FEATURES = resultInit
            windows?.mainWindow?.webContents.send('loadKeepKeyInfo', { payload: resultInit })
            //if not latest bootloader, set need bootloader update
            if (resultInit.bootloaderVersion !== "v1.1.0" && !config.updatedBootloader) {
                windows?.mainWindow?.webContents.send('openBootloaderUpdate', { })
                updateConfig({ isNewDevice: true })
                windows?.mainWindow?.webContents.send('setUpdaterMode', { payload: true })
            }
            if (config.updatedBootloader) {
                //update firmware next
                windows?.mainWindow?.webContents.send('openFirmwareUpdate', { })
            }
        }
        log.info(tag, "resultInit: ", resultInit)

        let allDevices = usb.getDeviceList()
        log.info(tag, "allDevices: ", allDevices)

        let resultWebUsb = usb.findByIds(11044, 2)
        if (resultWebUsb) {
            log.info(tag, "KeepKey connected in webusb!")
            //TODO only trigger if firmware modal open
            windows?.mainWindow?.webContents.send('onCompleteFirmwareUpload', {})
        }

        let resultPreWebUsb = usb.findByIds(11044, 1)
        if (resultPreWebUsb) {
            log.info(tag, "update required!")
        }

        let resultUpdater = usb.findByIds(11044, 1)
        if (resultUpdater) {
            log.info(tag, "UPDATER MODE DETECTED!")
        }
    } catch (e) {
        log.error(tag,e)
    }
}