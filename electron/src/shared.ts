import { IpcMainEvent } from "electron";

/*

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

export const shared: {
    USER: userType,
    eventIPC: IpcMainEvent | null,
    KEEPKEY_FEATURES: Record<string, unknown>
    KEEPKEY_STATE: number
    KEEPKEY_STATUS: string
} = {
    USER: {
        online: false,
        accounts: [],
        balances: []
    },
    eventIPC: null,
    KEEPKEY_FEATURES: {},
    KEEPKEY_STATE: 0,
    KEEPKEY_STATUS: "preInit"
}

export type userType = {
    online: boolean,
    accounts: Array<{
        pubkey: any;
        caip: string;
    }>,
    balances: any[]
}