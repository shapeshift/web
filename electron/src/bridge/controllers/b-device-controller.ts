import { Body, Controller, Get, Post, Route, Tags, Response } from 'tsoa';
import {lastKnownKeepkeyState } from '..';
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
        if (!lastKnownKeepkeyState.transport) throw new Error('Unable to communicate with device' )
        let resp = await lastKnownKeepkeyState.transport.readChunk()
        return {
            data: Buffer.from(resp).toString('hex')
        }
    }

    @Post('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async writeDevice(@Body() body: WriteBody) {
        console.log('writeDevice')
        if (!lastKnownKeepkeyState.transport) throw new Error('Unable to communicate with device' )
        let msg = Buffer.from(body.data, 'hex')
        lastKnownKeepkeyState.transport.writeChunk(msg)
        return { output: msg.toString() }
    }
}
