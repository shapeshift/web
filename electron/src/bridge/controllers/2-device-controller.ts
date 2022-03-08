import log from 'electron-log';
import { Body, Controller, Get, Post, Route, Tags, Security, Response } from 'tsoa';
import { keepkey } from '..';


export interface Read {
    data: string
}

export interface Write {
    output: string
}

export interface WriteBody {
    data: any
}

export interface Error {
    success: boolean
    reason: string
}


//route
@Tags('Raw KeepKey Device I/0 Endpoints')
@Route('exchange')
export class DeviceController extends Controller {

    private EVENT_LOG: Array<{ read: { data: string } }> = []

    @Get('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async readDevice(): Promise<Read | Error> {
        return new Promise<Read | Error>(async (resolve, reject) => {
            if (!keepkey.transport) return reject({ success: false, reason: 'Unable to communicate with device' })
            let resp = await keepkey.transport.readChunk()
            let output = {
                data: Buffer.from(resp).toString('hex')
            }
            // log.info('output: ', output)
            this.EVENT_LOG.push({ read: output })
            if (keepkey.event) keepkey.event.sender.send('dataSent', { output })
            return resolve(output)
        })
    }

    @Post('device')
    // @Security("api_key")
    @Response(500, "Unable to communicate with device")
    public async writeDevice(@Body() body: WriteBody): Promise<Write | Error> {
        return new Promise<Write | Error>((resolve, reject) => {
            if (!keepkey.transport) return reject({ success: false, reason: 'Unable to communicate with device' })
            let msg = Buffer.from(body.data, 'hex')
            keepkey.transport.writeChunk(msg)
            log.info('input: ', msg.toString('hex'))
            // EVENT_LOG.push({ write: output })
            if (keepkey.event) keepkey.event.sender.send('dataReceive', { output: msg })
            return resolve({ output: msg.toString() })
        })
    }
}
