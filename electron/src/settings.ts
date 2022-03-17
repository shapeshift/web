import { ipcMain } from "electron";
import { bridgeRunning, start_bridge, stop_bridge } from "./bridge";
import { db } from "./db";
import { kkAutoLauncher } from "./main";

let instance: Settings;

export class Settings {
    public shouldAutoLunch = true
    public shouldAutoStartBridge = true
    public shouldMinimizeToTray = true
    public bridgeApiPort = 1646

    constructor() {
        if (instance) {
            throw new Error('Settings can only be initialized once');
        }
        instance = this;

        db.findOne({ type: 'settings' }, (err, doc) => {
            if (!doc) return this.syncSettingsWithDB()

            this.shouldAutoLunch = doc.settings.shouldAutoLunch
            this.shouldAutoStartBridge = doc.settings.shouldAutoStartBridge
            this.shouldMinimizeToTray = doc.settings.shouldMinimizeToTray
            this.bridgeApiPort = doc.settings.bridgeApiPort
        })

        ipcMain.on('@app/update-settings', (_event, data) => {
            this.updateBulkSettings(data)
        })

        ipcMain.on('@app/settings', (event, _data) => {
            event.sender.send('@app/settings', {
                shouldAutoLunch: this.shouldAutoLunch,
                shouldAutoStartBridge: this.shouldAutoStartBridge,
                shouldMinimizeToTray: this.shouldMinimizeToTray,
                bridgeApiPort: this.bridgeApiPort
            })
        })
    }

    private syncSettingsWithDB() {
        db.findOne({ type: 'settings' }, (err, doc) => {
            if (!doc) return db.insert({
                type: 'settings', settings: {
                    shouldAutoLunch: this.shouldAutoLunch,
                    shouldAutoStartBridge: this.shouldAutoStartBridge,
                    shouldMinimizeToTray: this.shouldMinimizeToTray,
                    bridgeApiPort: this.bridgeApiPort
                }
            })

            db.update({ type: 'settings' }, {
                type: 'settings', settings: {
                    shouldAutoLunch: this.shouldAutoLunch,
                    shouldAutoStartBridge: this.shouldAutoStartBridge,
                    shouldMinimizeToTray: this.shouldMinimizeToTray,
                    bridgeApiPort: this.bridgeApiPort
                }
            })
        })
    }

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

    async setBridgeApiPort(value: number, bulk = false) {
        this.bridgeApiPort = value
        if (bridgeRunning) {
            await stop_bridge()
            start_bridge(value)
        }
        if (!bulk) this.syncSettingsWithDB()
    }

    updateBulkSettings({ shouldAutoLunch, shouldAutoStartBridge, shouldMinimizeToTray, bridgeApiPort }: {
        shouldAutoLunch?: boolean,
        shouldAutoStartBridge?: boolean,
        shouldMinimizeToTray?: boolean,
        bridgeApiPort?: number
    }) {
        if (shouldAutoLunch !== undefined) this.setShouldAutoLunch(shouldAutoLunch, true)
        if (shouldAutoStartBridge !== undefined) this.setShouldAutoStartBridge(shouldAutoStartBridge, true)
        if (shouldMinimizeToTray !== undefined) this.setShouldMinimizeToTray(shouldMinimizeToTray, true)
        if (bridgeApiPort !== undefined) this.setBridgeApiPort(bridgeApiPort, true)
        this.syncSettingsWithDB()
    }
}