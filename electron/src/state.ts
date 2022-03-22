/*
    Goals:
        When prompting user to update device handle/lock state

    Always be presenting user with path to functional device


  KeepKey Status codes
  state : status
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

import log from "electron-log";
import { keepkey } from './bridge'
import {windows} from "./main";

export let IS_UPDATEING_BOOTLOADER = false
export let IS_UPDATEING_FIRMWARE = false

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

export const device_connected_webusb = async function (resultInit:any){
    let tag = " | device_connected_webusb | "
    try{
        windows?.mainWindow?.webContents.send('closeBootloaderUpdate', { })

        log.info(tag,"resultInit: ",resultInit)
        if(IS_UPDATEING_FIRMWARE && keepkey.STATE === 6){
            log.info("is done updating bootloader!")
            //get current state
            IS_UPDATEING_FIRMWARE = false

            //close bootloader window
            windows?.mainWindow?.webContents.send('closeBootloaderUpdate', { })

            //close bootloader window
            windows?.mainWindow?.webContents.send('closeFirmwareUpdate', { })

        } else {
            log.info("is not in a firmware update")
        }

        //verify versions

    }catch(e){
        log.error(tag,"e: ",e)
    }
}


export const device_connected_pre_webusb = async function (resultInit:any){
    let tag = " | device_connected_pre_webusb | "
    try{
        log.info(tag,"resultInit: ",resultInit)
        if(IS_UPDATEING_BOOTLOADER && keepkey.STATE === 4){
            log.info("is done updating bootloader!")
            //get current state
            IS_UPDATEING_BOOTLOADER = false

            keepkey.STATUS = STATES[6]
            keepkey.STATE = STATE_ENGINE[STATES[6]]

            //close bootloader window
            windows?.mainWindow?.webContents.send('closeBootloaderUpdate', { })

            //update firmware
            windows?.mainWindow?.webContents.send('openFirmwareUpdate', { })
        } else {
            log.info("is first time connection")
        }
    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    Enter Firmware Update

 */

export const enter_firmware_update = async function (){
    let tag = " | enter_firmware_update | "
    try{
        //get current state
        IS_UPDATEING_FIRMWARE = true
    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    Enter Bootloader Update

 */

export const enter_bootloader_update = async function (){
    let tag = " | enter_bootloader_update | "
    try{
        //get current state
        IS_UPDATEING_BOOTLOADER = true
    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    No Devices:

    Prompt user to connect device
 */

export const set_no_devices = async function (){
    let tag = " | set_no_devices | "
    try{
        //get current state

        //handle changes
        //if any modals open close them

        //normal for device
        if(!IS_UPDATEING_BOOTLOADER && keepkey.STATE != 4){
            log.info(tag,"Not in bootloader update state")

            //open connect device
            windows?.mainWindow?.webContents.send('openHardwareError', { error: "no device", code: 1 })

            keepkey.STATUS = STATES[1]
            keepkey.STATE = STATE_ENGINE[STATES[1]]
        } else {
            log.info(tag,"in bootloader update state")
        }

    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    Out Of Box Device:

    welcome new keepkey user

    Prompt user to update bootloader
 */

export const set_new_device = async function (resultInit:any){
    let tag = " | set_new_device | "
    try{
        //get current state
        keepkey.STATUS = STATES[4]
        keepkey.STATE = STATE_ENGINE[STATES[4]]
        windows?.mainWindow?.webContents.send('openBootloaderUpdate', { })
    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    Out of date Bootloader
    Prompt user to update bootloader
 */

export const set_out_of_date_bootloader = async function (resultInit:any){
    let tag = " | set_out_of_date_bootloader | "
    try{

        if(!IS_UPDATEING_BOOTLOADER && !IS_UPDATEING_FIRMWARE && keepkey.STATE <= 2){
            keepkey.STATUS = STATES[4]
            keepkey.STATE = STATE_ENGINE[STATES[4]]
            windows?.mainWindow?.webContents.send('openBootloaderUpdate', { })
        } else {
            log.info(tag,"Not opening bootloader update window")
        }
    }catch(e){
        log.error(tag,"e: ",e)
    }
}

/*
    Out of date Bootloader

    Prompt user to update bootloader
 */

export const set_out_of_date_firmware = async function (resultInit:any){
    let tag = " | set_out_of_date_firmware | "
    try{
        //get current state

        if(keepkey.STATE <= 5){
            windows?.mainWindow?.webContents.send('closeBootloaderUpdate', { })
            keepkey.STATUS = STATES[5]
            keepkey.STATE = STATE_ENGINE[STATES[5]]
            windows?.mainWindow?.webContents.send('openFirmwareUpdate', { })
        } else {
            log.info(tag,"Not opening firmware update window")
        }
    }catch(e){
        log.error(tag,"e: ",e)
    }
}