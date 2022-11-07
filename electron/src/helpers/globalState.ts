import path from "path";
import nedb from 'nedb'
import fs from 'fs'
import { Server } from 'http'
import { BrowserWindow, IpcMainEvent } from "electron";
import { UserType } from "./types";
import { CONNECTED, DISCONNECTED, HARDWARE_ERROR, KKStateController } from "./kk-state-controller";
import { Settings } from "./settings";
import AutoLaunch from "auto-launch";
import { startTcpBridge, stopTcpBridge } from "../tcpBridge";
import { createAndUpdateTray } from "../tray";
import { queueIpcEvent } from "./utils";

export const assetsDirectory = path.join(__dirname, '../../assets')
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

// web render thread has indicated it is ready to receive ipc messages
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
export const setSplashWindow =  (value: BrowserWindow) => windows.splash = value
export const setMainWindow =  (value: BrowserWindow) => windows.splash = value

export const ipcQueue = new Array<{ eventName: string, args: any }>()

// tcp bridge running and keepkey is successfully connected
export const isWalletBridgeRunning = () => kkStateController?.lastState === CONNECTED && tcpBridgeRunning

export const settings = new Settings()

export const kkAutoLauncher = new AutoLaunch({
    name: 'KeepKey Desktop'
})

export const kkStateController = new KKStateController(async (eventName: string, args: any) => {
    if (eventName === CONNECTED) await startTcpBridge()
    else if (eventName === DISCONNECTED || eventName === HARDWARE_ERROR)  await stopTcpBridge()
    createAndUpdateTray()
    return queueIpcEvent(eventName, args)
})