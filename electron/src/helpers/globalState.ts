import path from "path";
import nedb from 'nedb'
import fs from 'fs'
import { Server } from 'http'
import { BrowserWindow } from "electron";

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

export let windows: {
    mainWindow: undefined | BrowserWindow,
    splash: undefined | BrowserWindow
} = {
    mainWindow: undefined,
    splash: undefined
}
export const setSplashWindow =  (value: BrowserWindow) => windows.splash = value
export const setMainWindow =  (value: BrowserWindow) => windows.splash = value

export let ipcQueue = new Array<{ eventName: string, args: any }>()
