import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import isDev from 'electron-is-dev'
import nedb from 'nedb'

const dbDirPath = isDev ? path.join(__dirname, '../.KeepKey') : path.join(app.getPath('userData'), './.KeepKey')
const dbPath = path.join(dbDirPath, './db')

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbDirPath)
    fs.closeSync(fs.openSync(dbPath, 'w'))
}

export const db = new nedb({ filename: dbPath, autoload: true });
