/*

    Bridge REST endpoints



 */
import { ipcMain } from 'electron';
import { uniqueId } from 'lodash';
import { db } from '../../db';
import { windows } from '../../main';
import { shared } from '../../shared';

import { Body, Controller, Get, Post, Header, Route, Tags } from 'tsoa';
import { keepkey } from '../';


export interface Status {
    success: boolean,
    status: string,
    state: number
}

export interface SignedTx {
    success: boolean,
    status: string,
    signedTx: any
}

//PairResponse
export interface GenericResponse {
    success: boolean
}

//PairResponse
export interface PairResponse {
    success: boolean,
    reason: string
}

export interface PairBody {
    serviceName: string,
    serviceImageUrl: string
}

export interface Pubkey {
    pubkey: string
    caip: string
}

export interface User {
    online: boolean,
    accounts: any,
    balances: any
}

export interface Error {
    success: boolean
    tag: string
    e: any
}

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
export class IndexController extends Controller {

    /*
        Health endpoint
    */
    @Get('/status')
    public async status(): Promise<Status> {
        return {
            success: true,
            status: keepkey.STATUS,
            state: keepkey.STATE
        }
    }

    @Get('/device')
    public async device(): Promise<Record<string, unknown>> {
        return shared.KEEPKEY_FEATURES
    }

    @Post('/pair')
    public async pair(@Body() body: PairBody, @Header('authorization') serviceKey: string): Promise<PairResponse> {
        return new Promise<PairResponse>((resolve, reject) => {
            if (!windows.mainWindow || windows.mainWindow.isDestroyed()) {
                this.setStatus(500)
                return resolve({ success: false, reason: 'Window not open' })
            }
            const nonce = uniqueId()

            windows.mainWindow.webContents.send('@modal/pair', {
                serviceName: body.serviceName,
                serviceImageUrl: body.serviceImageUrl,
                nonce
            })

            if (windows.mainWindow.focusable) windows.mainWindow.focus()

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

                    resolve({ success: true, reason: '' })
                }
            })

            ipcMain.once(`@bridge/reject-service-${nonce}`, (event, data) => {
                if (data.nonce = nonce) {
                    ipcMain.removeAllListeners(`@bridge/reject-service-${nonce}`)
                    this.setStatus(401)
                    resolve({ success: false, reason: 'Pairing was rejected by user' })
                }
            })
        })
    }
}
