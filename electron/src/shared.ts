import { IpcMainEvent } from "electron";

export const shared: {
    USER: userType,
    eventIPC: IpcMainEvent | null,
    KEEPKEY_FEATURES: Record<string, unknown>
} = {
    USER: {
        online: false,
        accounts: [],
        balances: []
    },
    eventIPC: null,
    KEEPKEY_FEATURES: {},
}

export type userType = {
    online: boolean,
    accounts: Array<{
        pubkey: any;
        caip: string;
    }>,
    balances: any[]
}