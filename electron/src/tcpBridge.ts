import { server, setServer, setTcpBridgeClosing, setTcpBridgeRunning, setTcpBridgeStarting, tcpBridgeClosing, tcpBridgeRunning, tcpBridgeStarting } from "./globalState"
import { RegisterRoutes } from "./helpers/routes/routes"
import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { createAndUpdateTray } from "./tray"

export const startTcpBridge = async (port?: number) => {
    if (tcpBridgeRunning || tcpBridgeStarting) return
    setTcpBridgeStarting(true)
    let API_PORT = port || 1646

    const appExpress = express()
    appExpress.use(cors())
    appExpress.use(bodyParser.urlencoded({ extended: true }))
    appExpress.use(bodyParser.json())

    const swaggerDocument = require(path.join(__dirname, '../api/dist/swagger.json'))
    if (!swaggerDocument) throw Error("Failed to load API SPEC!")

    appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    //swagger.json
    appExpress.use('/spec', express.static(path.join(__dirname, '../../api/dist')));

    RegisterRoutes(appExpress);

    await new Promise( (resolve) =>  setServer(appExpress.listen(API_PORT, () => resolve(true))))
    log.info(`Tcp bridge started at http://localhost:${API_PORT}`)

    setTcpBridgeStarting(false)
    setTcpBridgeRunning(true)
    createAndUpdateTray()
}

export const stopTcpBridge = async () => {
    if(tcpBridgeClosing) return false
    setTcpBridgeClosing(true)
    await new Promise(async (resolve) => {
        createAndUpdateTray()
        if(server) {
            server?.close(async () => {
                setTcpBridgeRunning(false)
                setTcpBridgeClosing(false)
                createAndUpdateTray()
                resolve(true)
            })
        } else {
            setTcpBridgeRunning(false)
            setTcpBridgeClosing(false)
            createAndUpdateTray()
            resolve(true)
        }
    })
    return true
}
