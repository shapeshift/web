import { ipcMain } from 'electron';
import { uniqueId } from 'lodash';

import { Body, Controller, Get, Post, Header, Route, Tags, Response, Security, Middlewares } from 'tsoa';
import { GenericResponse, PairBody, PairResponse, UserType } from '../types';
import { db, kkStateController, shared, windows } from '../../globalState';
import { createMainWindow } from '../utils';
import { logger } from '../middlewares/logger';


export class ApiError extends Error {
    private statusCode: number;
    constructor(name: string, statusCode: number, message?: string) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
    }
}

@Tags('Client Endpoints')
@Route('')
export class CIndexController extends Controller {

    /*
        Health endpoint
        // TODO fix
    */
    @Get('/status')
    public async status(): Promise<string | undefined> {
        return kkStateController.lastState
    }

    @Get('/device')
    public async device(): Promise<Record<string, unknown>> {
        return shared.KEEPKEY_FEATURES
    }

    @Response(500)
    @Middlewares([logger])
    @Post('/pair')
    public async pair(@Body() body: PairBody, @Header('authorization') serviceKey: string): Promise<PairResponse> {
        return new Promise<PairResponse>(async (resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                if (!await createMainWindow()) {
                    this.setStatus(500)
                    return resolve({ success: false, reason: 'Window not open' })
                }
            }

            if (!body.serviceImageUrl || !body.serviceName) {
                this.setStatus(500)
                return resolve({ success: false, reason: 'Missing body parameters' })
            }

            const isAlreadyPaired = await new Promise<boolean>((innerResolve, _reject) => {
                db.findOne({ type: 'service', serviceName: body.serviceName, serviceKey }, (err, doc) => {
                    if (!doc) innerResolve(false)
                    innerResolve(true)
                })
            })

            if (isAlreadyPaired) return resolve({ success: true, reason: 'Service already exists' })

            const nonce = uniqueId()

            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                this.setStatus(500)
                return resolve({ success: false, reason: 'Window not open' })
            }

            windows.mainWindow.webContents.send('@modal/pair', {
                type: 'native',
                data: {
                    serviceName: body.serviceName,
                    serviceImageUrl: body.serviceImageUrl
                },
                nonce
            })

            if (windows.mainWindow.focusable) {
                windows.mainWindow.focus()
                windows.mainWindow.setAlwaysOnTop(true)
            }

            ipcMain.once(`@bridge/approve-service-${nonce}`, (event, data) => {
                if (data.nonce = nonce) {
                    ipcMain.removeAllListeners(`@bridge/approve-service-${nonce}`)
                    db.insert({
                        type: 'service',
                        addedOn: Date.now(),
                        serviceName: body.serviceName,
                        serviceImageUrl: body.serviceImageUrl,
                        serviceKey
                    })

                    db.insert({
                        type: 'pairing',
                        addedOn: Date.now(),
                        serviceName: body.serviceName,
                        serviceImageUrl: body.serviceImageUrl,
                        pairingType: 'sdk'
                    })

                    db.find({ type: 'service' }, (err, docs) => {
                        if (windows.mainWindow) windows.mainWindow.webContents.send('@bridge/paired-apps', docs)
                    })

                    if (windows.mainWindow) windows.mainWindow.setAlwaysOnTop(false)
                    resolve({ success: true, reason: '' })
                }
            })

            ipcMain.once(`@bridge/reject-service-${nonce}`, (event, data) => {
                if (data.nonce = nonce) {
                    ipcMain.removeAllListeners(`@bridge/reject-service-${nonce}`)
                    this.setStatus(401)
                    if (windows.mainWindow) windows.mainWindow.setAlwaysOnTop(false)
                    resolve({ success: false, reason: 'Pairing was rejected by user' })
                }
            })
        })
    }

    @Get('/auth/verify')
    @Security("api_key")
    @Response(401, "Please provide a valid serviceKey")
    public async verifyAuth(): Promise<GenericResponse> {
        return {
            success: true
        }
    }

    @Get('/user')
    @Security("api_key")
    @Middlewares([logger])
    @Response(401, "Please provide a valid serviceKey")
    public async user(): Promise<UserType> {
        return shared.USER
    }
}
