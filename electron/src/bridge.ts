import swaggerUi from 'swagger-ui-express'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import log from 'electron-log'
import { NodeWebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-nodewebusb'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import { Server } from 'http'
import { windows } from './main'
import { app } from 'electron'
import wait from 'wait-promise'
import { shared } from './shared'
import { updateMenu } from './tray'

const appExpress = express()
appExpress.use(cors)
appExpress.use(bodyParser.urlencoded({ extended: false }))
appExpress.use(bodyParser.json)

//OpenApi spec generated from template project https://github.com/BitHighlander/keepkey-bridge
const swaggerDocument = require(path.join(__dirname, '../api/dist/swagger.json'))
if (!swaggerDocument) throw Error("Failed to load API SPEC!")
const adapter = NodeWebUSBKeepKeyAdapter.useKeyring(new Keyring())

import { KEEPKEY_FEATURES } from './keepkey'

let USERNAME
let server: Server

const EVENT_LOG: Array<{ read: { data: string } }> = []
let sleep = wait.sleep;

export let bridgeRunning = false

/*
 
  KeepKey Status codes
 
  state : status
  ---------------
     -1 : error
      0 : preInit
      1 : no devices
      2 : device connected
      3 : bridge online
      4 : bootloader out of date
      5 : firmware out of date
 */


let STATE = 0
let STATUS = 'preInit'

export const start_bridge = async function (event) {
    let tag = " | start_bridge | "
    try {
        let device
        try {
            device = await adapter.getDevice()
            log.info(tag, "device: ", device)
        } catch (e) {
            STATE = 1
            STATUS = `no devices`
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
        }

        let transport
        if (device) {
            transport = await adapter.getTransportDelegate(device)
            await transport.connect?.()
            log.info(tag, "transport: ", transport)

            STATE = 2
            STATUS = 'keepkey connected'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
        } else {
            log.info('Can not start! waiting for device connect')
        }

        let API_PORT = process.env['API_PORT_BRIDGE'] || '1646'

        /*
            KeepKey bridge
    
            endpoints:
              raw i/o keepkey bridge:
              status:
              pubkeys:
              sign:
    
    
         */

        //docs
        appExpress.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        //swagger.json
        appExpress.use('/spec', express.static(path.join(__dirname, '../api/dist')));

        //status
        appExpress.all('/status', async function (req, res, next) {
            try {
                if (req.method === 'GET') {
                    res.status(200).json({
                        success: true,
                        username: USERNAME,
                        status: STATUS,
                        state: STATE
                    })
                }
                next()
            } catch (e) {
                throw e
            }
        })

        appExpress.all('/device', async function (req, res, next) {
            try {
                if (req.method === 'GET') {
                    res.status(200).json(KEEPKEY_FEATURES)
                }
                next()
            } catch (e) {
                throw e
            }
        })

        /*
            Protected endpoint middleware
            Only allow approved applications collect data
    
            all routes below are protected
         */
        //TODO
        // let authChecker = (req, res, next) => {
        //   console.log("header: ",req.headers);
        //   const host = req.headers.host;
        //   let origin = req.headers.origin;
        //   const referer = req.headers.referer;
        //   if(!origin) origin = referer
        //   console.log("origin: ",origin);
        //   console.log("host: ",host);
        //   if(!origin) {
        //     res.status(400).json("Unable to determine origin!")
        //   } else if(APPROVED_ORIGINS.indexOf(origin) >= 0){
        //     console.log("Approved origin!")
        //     next();
        //   } else {
        //     event.sender.send('approveOrigin', { origin })
        //   }
        // };
        // appExpress.use(authChecker);

        if (device) {
            appExpress.all('/exchange/device', async function (req, res, next) {
                try {
                    if (req.method === 'GET') {
                        let resp = await transport.readChunk()
                        let output = {
                            data: Buffer.from(resp).toString('hex')
                        }
                        log.info('output: ', output)
                        EVENT_LOG.push({ read: output })
                        event.sender.send('dataSent', { output })
                        if (res.status) res.status(200).json(output)
                    } else if (req.method === 'POST') {
                        let body = req.body
                        let msg = Buffer.from(body.data, 'hex')
                        transport.writeChunk(msg)
                        log.info('input: ', msg.toString('hex'))
                        // EVENT_LOG.push({ write: output })
                        event.sender.send('dataReceive', { output: msg })
                        res.status(200).json({})
                    } else {
                        throw Error('unhandled')
                    }
                    next()
                } catch (e) {
                    throw e
                }
            })
        } else {
            appExpress.all('/exchange/device', async function (req, res, next) {
                try {
                    res.status(200).json({
                        success: false,
                        msg: "Device not connected!"
                    })
                    next()
                } catch (e) {
                    throw e
                }
            })
        }


        //userInfo
        appExpress.all('/user', async function (req, res, next) {
            try {
                if (req.method === 'GET') {
                    res.status(200).json(shared.USER)
                }
                next()
            } catch (e) {
                throw e
            }
        })

        //sign
        appExpress.all('/sign', async function (req, res, next) {

            try {
                console.log("checkpoint1: ")
                if (req.method === 'POST') {
                    let body = req.body
                    console.log("body: ", body)
                    if (!windows.mainWindow) return res.status(500)
                    windows.mainWindow.setAlwaysOnTop(true)
                    if (!windows.mainWindow.isVisible()) {
                        windows.mainWindow.show()
                        app.dock.show()
                    }
                    event.sender.send('signTx', { payload: body })
                    //hold till signed
                    while (!shared.SIGNED_TX) {
                        console.log("waiting!")
                        await sleep(300)
                    }
                    res.status(200).json({ success: true, status: 'signed', signedTx: shared.SIGNED_TX })
                    shared.SIGNED_TX = null
                }
                next()
            } catch (e) {
                throw e
            }
        })

        //catchall
        appExpress.use((req, res, next) => {
            const status = 500, message = 'something went wrong. ', data = {}
            //log.info(req.body, { status: status, message: message, data: data })
            try {
                res.status(status).json({ message, data })
            } catch (e) { }
        })

        //port
        try {
            server = appExpress.listen(API_PORT, () => {
                event.sender.send('playSound', { sound: 'success' })
                log.info(`server started at http://localhost:${API_PORT}`)
                STATE = 3
                STATUS = 'bridge online'
                event.sender.send('setKeepKeyState', { state: STATE })
                event.sender.send('setKeepKeyStatus', { status: STATUS })
                updateMenu(STATE)
            })
        } catch (e) {
            event.sender.send('playSound', { sound: 'fail' })
            STATE = -1
            STATUS = 'bridge error'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
            updateMenu(STATE)
            log.info('e: ', e)
        }

        bridgeRunning = true

    } catch (e) {
        log.error(e)
    }
}

export const stop_bridge = async (event) => {
    try {
        event.sender.send('playSound', { sound: 'fail' })
        log.info('server: ', server)
        server.close(() => {
            log.info('Closed out remaining connections')
            STATE = 2
            STATUS = 'device connected'
            event.sender.send('setKeepKeyState', { state: STATE })
            event.sender.send('setKeepKeyStatus', { status: STATUS })
            updateMenu(STATE)
        })
        bridgeRunning = false
    } catch (e) {
        log.error(e)
    }
}
