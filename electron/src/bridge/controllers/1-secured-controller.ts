/*

    Bridge REST endpoints



 */

import { Body, Controller, Get, Post, Security, Route, Tags, Response } from 'tsoa';
import { keepkey } from '../';



export interface GenericResponse {
    success: boolean
}


@Tags('Client Endpoints')
@Route('')
export class SecuredController extends Controller {
    @Response(401, "Please provice a valid serviceKey")
    @Get('/auth/verify')
    @Security("api_key")
    public async verifyAuth(): Promise<GenericResponse> {
        return {
            success: true
        }
    }
}
