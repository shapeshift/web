
import {windows} from "./main";

const TAG = ' | KeepKey | '

import { getConfig, updateConfig } from "keepkey-config";

import log from "electron-log";
import usb from "usb";
import { ipcMain } from "electron";
import { shared } from "./shared";
import {
    set_no_devices,
    set_new_device,
    enter_bootloader_update,
    device_connected_pre_webusb,
    device_connected_webusb, enter_firmware_update, set_out_of_date_bootloader, set_out_of_date_firmware
} from "./state";

import Hardware from "@keepkey/keepkey-hardware-hid"


let update_firmware = async function(firmware:any){
    let tag = " | update_firmware | "
    try{
        const updateResponse = await Hardware.loadFirmware(firmware)
        log.info(tag, "updateResponse: ", updateResponse)
    }catch(e){
        throw e
    }
}

ipcMain.on('@keepkey/update-firmware', async event => {
    const tag = TAG + ' | onUpdateFirmware | '
    try {
        enter_firmware_update()
        log.info(tag," checkpoint !!!!")
        let result = await Hardware.getLatestFirmwareData()
        log.info(tag," result: ",result)

        let firmware = await Hardware.downloadFirmware(result.firmware.url)
        if(!firmware) throw Error("Failed to load firmware from url!")

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
        enter_bootloader_update()
        log.info(tag, "checkpoint: ")
        let result = await Hardware.getLatestFirmwareData()
        updateConfig({ attemptUpdateBootloader: true })
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
        //primart Detect
        let allDevices = usb.getDeviceList()
        log.info(tag, "allDevices: ", allDevices)

        let deviceDetected = false
        let resultWebUsb = usb.findByIds(11044, 2)
        if (resultWebUsb) {
            log.info(tag, "KeepKey connected in webusb!")
            deviceDetected = true
            device_connected_webusb(resultWebUsb)
        }

        let resultPreWebUsb = usb.findByIds(11044, 1)
        if (resultPreWebUsb) {
            log.info(tag, "update required! (resultPreWebUsb)")
            deviceDetected = true
            device_connected_pre_webusb(resultPreWebUsb)
        }

        if(!deviceDetected){
            log.info(tag,"No devices connected")
            set_no_devices()
        } else {
            log.info(tag,"resultWebUsb: ",resultWebUsb)
            log.info(tag,"resultPreWebUsb: ",resultPreWebUsb)
        }

        //HID detect
        let latestFirmware = await Hardware.getLatestFirmwareData()
        log.info(tag, "latestFirmware: ", latestFirmware)
        windows?.mainWindow?.webContents.send('loadKeepKeyFirmwareLatest', { payload: latestFirmware })

        //init
        let resultInit = await Hardware.init()
        if (resultInit && resultInit.success && resultInit.bootloaderMode) {
            windows?.mainWindow?.webContents.send('setUpdaterMode', { payload: true })
        }
        if (resultInit && resultInit.success && resultInit.wallet) {
            log.info(tag,"resultInit: ",resultInit)
            log.info(tag,"resultInit.bootloaderVersion: ",resultInit.bootloaderVersion)
            log.info(tag,"resultInit.firmwareVersion: ",resultInit.firmwareVersion)
            windows?.mainWindow?.webContents.send('closeHardwareError', { })
            shared.KEEPKEY_FEATURES = resultInit
            windows?.mainWindow?.webContents.send('loadKeepKeyInfo', { payload: resultInit })

            //if new
            if(resultInit.bootloaderVersion === "v1.0.3" && resultInit.firmwareVersion === "v4.0.0"){
                set_new_device(resultInit)
            }

            //if bootloader needs update
            if (resultInit.bootloaderVersion !== latestFirmware.bootloader.version) {
                await set_out_of_date_bootloader(resultInit)
            }

            //if firmware needs update
            if (resultInit.firmwareVersion !== latestFirmware.firmware.version && resultInit.bootloaderVersion === latestFirmware.bootloader.version) {
                await set_out_of_date_firmware(resultInit)
            }

            if(resultInit.firmwareVersion === latestFirmware.firmware.version){
                windows?.mainWindow?.webContents.send('closeFirmwareUpdate', { })
            }
            if(resultInit.bootloaderVersion === latestFirmware.bootloader.version){
                windows?.mainWindow?.webContents.send('closeBootloaderUpdate', { })
            }
            //if not latest bootloader, set need bootloader update

        }
        log.info(tag, "resultInit: ", resultInit)



    } catch (e) {
        log.error(tag,e)
    }
}