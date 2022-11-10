import path from "path";
import nedb from 'nedb'
import fs from 'fs'
import { Server } from 'http'
import { BrowserWindow, IpcMainEvent } from "electron";
import { UserType } from "./helpers/types";
import { CONNECTED, DISCONNECTED, HARDWARE_ERROR, KKStateController, NEEDS_INITIALIZE } from "./helpers/kk-state-controller";
import { Settings } from "./helpers/settings";
import AutoLaunch from "auto-launch";
import { startTcpBridge, stopTcpBridge } from "./tcpBridge";
import { createAndUpdateTray } from "./tray";
import { queueIpcEvent } from "./helpers/utils";
import { BridgeLogger } from "./helpers/bridgeLogger";
import log from 'electron-log'

export const assetsDirectory = path.join(__dirname, '../assets')
export const isMac = process.platform === "darwin"
export const isWin = process.platform === "win32"
export const isLinux = process.platform !== "darwin" && process.platform !== "win32"
export const ALLOWED_HOSTS = ["localhost"]

const homedir = require("os").homedir();
const dbDirPath = path.join(homedir, ".keepkey");
const dbPath = path.join(dbDirPath, './db')
if (!fs.existsSync(dbDirPath)) {
    fs.mkdirSync(dbDirPath)
    fs.closeSync(fs.openSync(dbPath, 'w'))
}
export const db = new nedb({ filename: dbPath, autoload: true });

export const shared: {
    USER: UserType,
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

db.findOne({ type: 'user' }, (err, doc) => {
    if (doc) shared.USER = doc.user
})
export let server: Server
export let setServer = (value: Server) => server = value

export let tcpBridgeRunning = false
export let setTcpBridgeRunning = (value: boolean) => tcpBridgeRunning = value

export let tcpBridgeStarting = false
export let setTcpBridgeStarting = (value: boolean) => tcpBridgeStarting = value

export let tcpBridgeClosing = false
export let setTcpBridgeClosing = (value: boolean) => tcpBridgeClosing = value

export let renderListenersReady = false
export let setRenderListenersReady = (value: boolean) => renderListenersReady = value

export let shouldShowWindow = false
export let setShouldShowWindow = (value: boolean) => shouldShowWindow = value

export const windows: {
    mainWindow: undefined | BrowserWindow,
    splash: undefined | BrowserWindow
} = {
    mainWindow: undefined,
    splash: undefined
}

export const ipcQueue = new Array<{ eventName: string, args: any }>()

export const isWalletBridgeRunning = () => kkStateController?.lastState === CONNECTED && tcpBridgeRunning

export const settings = new Settings()
export const bridgeLogger = new BridgeLogger()

export const kkAutoLauncher = new AutoLaunch({
    name: 'KeepKey Desktop'
})

export const kkStateController = new KKStateController(async (eventName: string, args: any) => {
    if (eventName === CONNECTED || eventName === NEEDS_INITIALIZE) await startTcpBridge()
    else if (eventName === DISCONNECTED || eventName === HARDWARE_ERROR)  await stopTcpBridge()
    createAndUpdateTray()
    log.info('keepkey state changed: ', eventName, args)
    return queueIpcEvent(eventName, args)
})

export let deviceBusyRead = false
export let setDeviceBusyRead = (value: boolean) => deviceBusyRead = value
export let deviceBusyWrite = false
export let setDeviceBusyWrite = (value: boolean) => deviceBusyWrite = value