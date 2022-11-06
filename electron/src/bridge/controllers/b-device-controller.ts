import { Body, Controller, Get, Post, Route, Tags, Response } from 'tsoa';
import {kkStateController } from '..';
import { WriteBody } from '../types';

//route
@Tags('Raw KeepKey Device I/0 Endpoints')
@Route('exchange')
export class BDeviceController extends Controller {
    @Get('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async readDevice() {
        console.log('readDevice')
        if (!kkStateController.transport) throw new Error('Unable to communicate with device' )
        let resp = await kkStateController.transport.readChunk()
        return {
            data: Buffer.from(resp).toString('hex')
        }
    }

    @Post('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async writeDevice(@Body() body: WriteBody) {
        console.log('writeDevice')
        if (!kkStateController.transport) throw new Error('Unable to communicate with device' )
        let msg = Buffer.from(body.data, 'hex')
        kkStateController.transport.writeChunk(msg)
        return { output: msg.toString() }
    }
}
