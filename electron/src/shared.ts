import { IpcMainEvent } from "electron";

export const shared: {
    USER: {
        online: boolean,
        accounts: Array<{
            pubkey: any;
            caip: string;
        }>,
        balances: any[]
    },
    SIGNED_TX: any,
    eventIPC: IpcMainEvent | null,
    KEEPKEY_FEATURES: Record<string, unknown>
} = {
    USER: {
        online: false,
        accounts: [],
        balances: []
    },
    SIGNED_TX: null,
    eventIPC: null, 
    KEEPKEY_FEATURES: {}
}