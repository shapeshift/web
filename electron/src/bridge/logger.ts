import { readFileSync, writeFileSync } from "fs"
import path from 'path'
import { app } from 'electron'

export interface BridgeLog {
    serviceKey: string,
    body?: Object,
    time: number
}

export class BridgeLogger {
    private logs: BridgeLog[]
    public logPath = path.join(app.getPath('logs'), './bridge.json')

    constructor() {
        let data: string | Array<BridgeLog> = readFileSync(this.logPath).toString()
        if (!data) this.logs = new Array<BridgeLog>
        data = JSON.parse(data)
        if (!data) this.logs = new Array<BridgeLog>
        this.logs = data as Array<BridgeLog>
    }

    log(data: BridgeLog) {
        this.logs.push(data)
    }

    saveLogs() {
        writeFileSync(this.logPath, JSON.stringify(this.logs))
    }
}