import log from 'electron-log';
import { windows } from '../../main';
import { Body, Controller, Get, Post, Route, Tags, Security, Response } from 'tsoa';
import { lastKnownKeepkeyState } from '..';
import { Read, Error, WriteBody, Write } from '../types';
import { app } from 'electron'

//route
@Tags('Raw KeepKey Device I/0 Endpoints')
@Route('exchange')
export class BDeviceController extends Controller {

    private EVENT_LOG: Array<{ read: { data: string } }> = []

    @Get('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async readDevice(): Promise<Read | Error> {
        return new Promise<Read | Error>(async (resolve, reject) => {
            if (!lastKnownKeepkeyState.transport) return reject({ success: false, reason: 'Unable to communicate with device' })
            try{
                let resp = await lastKnownKeepkeyState.transport.readChunk()
                let output = {
                    data: Buffer.from(resp).toString('hex')
                }
                // log.info('output: ', output)
                this.EVENT_LOG.push({ read: output })
                if (windows.mainWindow) windows.mainWindow.webContents.send('dataSent', { output })
                return resolve(output)
            }catch(e){
                log.error("Hardware Error read: ",e)
                //exit app
                app.relaunch()
                app.exit()
            }
        })
    }

    @Post('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async writeDevice(@Body() body: WriteBody): Promise<Write | Error> {
        return new Promise<Write | Error>((resolve, reject) => {
            try{
                if (!lastKnownKeepkeyState.transport) return reject({ success: false, reason: 'Unable to communicate with device' })
                let msg = Buffer.from(body.data, 'hex')
                lastKnownKeepkeyState.transport.writeChunk(msg)
                log.info('input: ', msg.toString('hex'))
                // EVENT_LOG.push({ write: output })
                if (windows.mainWindow) windows.mainWindow.webContents.send('dataReceive', { output: msg })
                return resolve({ output: msg.toString() })
            }catch(e){
                log.error("Hardware Error write: ",e)
            }
        })
    }
}
