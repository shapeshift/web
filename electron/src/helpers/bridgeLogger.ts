import { readFileSync, writeFileSync, existsSync } from "fs"
import path from 'path'
import { app } from 'electron'

export interface BridgeLog {
    serviceKey: string,
    body?: any,
    route: string,
    method: string,
    time: number
}

export class BridgeLogger {
    // commented this out because it was crashing for elmutt and toshi
    // private logs: BridgeLog[] = new Array<BridgeLog>
    // public logPath = path.join(app.getPath('logs'), './bridge.json')

    constructor() {
        // if (existsSync(this.logPath)) {
        //     let data: string | Array<BridgeLog> = readFileSync(this.logPath).toString()
        //     if (!data) this.logs = new Array<BridgeLog>
        //     data = JSON.parse(data)
        //     if (!data) this.logs = new Array<BridgeLog>
        //     this.logs = data as Array<BridgeLog>
        // }
    }

    log(data: BridgeLog) {
        // this.logs.push(data)
    }

    saveLogs() {
        // const stringifiedLogs = JSON.stringify(this.logs)
        // if (!stringifiedLogs) return
        // writeFileSync(this.logPath, stringifiedLogs)
    }

    fetchLogs(serviceKey: string) {
        // const logs = this.logs.filter((log) => log.serviceKey === serviceKey)
        // return logs
    }
}