import fs from 'fs'
import path from 'path'
import nedb from 'nedb'
const homedir = require("os").homedir();

const dbDirPath = path.join(homedir, ".keepkey");
const dbPath = path.join(dbDirPath, './db')

if (!fs.existsSync(dbDirPath)) {
    fs.mkdirSync(dbDirPath)
    fs.closeSync(fs.openSync(dbPath, 'w'))
}

export const db = new nedb({ filename: dbPath, autoload: true });
