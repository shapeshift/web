import { ipcMain } from "electron";
import { bridgeRunning, server, start_bridge, stop_bridge } from "./bridge";
import { db } from "./db";
import { kkAutoLauncher } from "./main";
import { AddressInfo } from "net";

let instance: Settings;

export class Settings {
    public shouldAutoLunch = true
    public shouldAutoStartBridge = true
    public shouldMinimizeToTray = true
    public shouldAutoUpdate = true
    public bridgeApiPort = 1646

    constructor() {
        if (instance) {
            throw new Error('Settings can only be initialized once');
        }
        instance = this;

        ipcMain.on('@app/update-settings', (_event, data) => {
            this.updateBulkSettings(data)
        })

        ipcMain.on('@app/settings', (event, _data) => {
            event.sender.send('@app/settings', {
                shouldAutoLunch: this.shouldAutoLunch,
                shouldAutoStartBridge: this.shouldAutoStartBridge,
                shouldMinimizeToTray: this.shouldMinimizeToTray,
                shouldAutoUpdate: this.shouldAutoUpdate,
                bridgeApiPort: this.bridgeApiPort
            })
        })
    }


    loadSettingsFromDb = () => new Promise<Settings>((resolve, reject) => {
        db.findOne({ type: 'settings' }, async (err, doc) => {
            if (!doc) {
                resolve(this)
                return this.syncSettingsWithDB()
            }

            if (doc.settings.shouldAutoLunch === undefined || doc.settings.shouldAutoStartBridge === undefined ||
                doc.settings.shouldMinimizeToTray === undefined || doc.settings.shouldAutoUpdate === undefined ||
                doc.settings.bridgeApiPort === undefined) await this.syncSettingsWithDB()

            this.shouldAutoLunch = doc.settings.shouldAutoLunch
            this.shouldAutoStartBridge = doc.settings.shouldAutoStartBridge
            this.shouldMinimizeToTray = doc.settings.shouldMinimizeToTray
            this.shouldAutoUpdate = doc.settings.shouldAutoUpdate
            this.bridgeApiPort = doc.settings.bridgeApiPort
            resolve(this)
        })
    })


    private syncSettingsWithDB = () => new Promise<void>((resolve, reject) => {
        db.findOne({ type: 'settings' }, (err, doc) => {
            if (!doc) return db.insert({
                type: 'settings', settings: {
                    shouldAutoLunch: this.shouldAutoLunch,
                    shouldAutoStartBridge: this.shouldAutoStartBridge,
                    shouldMinimizeToTray: this.shouldMinimizeToTray,
                    shouldAutoUpdate: this.shouldAutoUpdate,
                    bridgeApiPort: this.bridgeApiPort
                }
            })

            db.update({ type: 'settings' }, {
                type: 'settings', settings: {
                    shouldAutoLunch: this.shouldAutoLunch,
                    shouldAutoStartBridge: this.shouldAutoStartBridge,
                    shouldMinimizeToTray: this.shouldMinimizeToTray,
                    shouldAutoUpdate: this.shouldAutoUpdate,
                    bridgeApiPort: this.bridgeApiPort
                }
            })
            resolve()
        })
    })

    setShouldAutoLunch(value: boolean, bulk = false) {
        this.shouldAutoLunch = value
        kkAutoLauncher.isEnabled().then((autoLaunch) => {
            if (autoLaunch && value) return
            if (!autoLaunch && value) return kkAutoLauncher.enable()
            if (!autoLaunch && !value) return kkAutoLauncher.disable()
        })
        if (!bulk) this.syncSettingsWithDB()
    }

    setShouldAutoStartBridge(value: boolean, bulk = false) {
        this.shouldAutoStartBridge = value
        if (!bulk) this.syncSettingsWithDB()
    }

    setShouldMinimizeToTray(value: boolean, bulk = false) {
        this.shouldMinimizeToTray = value
        if (!bulk) this.syncSettingsWithDB()
    }

    setShouldAutoUpdate(value: boolean, bulk = false) {
        this.shouldAutoUpdate = value
        if (!bulk) this.syncSettingsWithDB()
    }

    async setBridgeApiPort(value: number, bulk = false) {
        this.bridgeApiPort = value
        if (bridgeRunning) {
            const address = server.address() as AddressInfo
            if (address.port !== value) {
                await stop_bridge()
                start_bridge(value)
            }
        }
        if (!bulk) this.syncSettingsWithDB()
    }

    updateBulkSettings({ shouldAutoLunch, shouldAutoStartBridge, shouldMinimizeToTray, shouldAutoUpdate, bridgeApiPort }: {
        shouldAutoLunch?: boolean,
        shouldAutoStartBridge?: boolean,
        shouldMinimizeToTray?: boolean,
        shouldAutoUpdate?: boolean,
        bridgeApiPort?: number
    }) {
        console.log(shouldAutoLunch, shouldAutoStartBridge, shouldMinimizeToTray, bridgeApiPort)
        if (shouldAutoLunch !== undefined) this.setShouldAutoLunch(shouldAutoLunch, true)
        if (shouldAutoStartBridge !== undefined) this.setShouldAutoStartBridge(shouldAutoStartBridge, true)
        if (shouldMinimizeToTray !== undefined) this.setShouldMinimizeToTray(shouldMinimizeToTray, true)
        if (shouldAutoUpdate !== undefined) this.setShouldAutoUpdate(shouldAutoUpdate, true)
        if (bridgeApiPort !== undefined) this.setBridgeApiPort(bridgeApiPort, true)
        this.syncSettingsWithDB()
    }
}