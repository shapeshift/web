import * as express from "express";
import { db } from "../db";

export function expressAuthentication(
    request: express.Request,
    securityName: string,
    scopes?: string[]
): Promise<any> {
    if (securityName === "api_key") {
        let serviceKey;
        if (request.headers && request.headers.authorization) {
            serviceKey = request.headers.authorization;
        }


        if (!serviceKey) {
            return Promise.reject({ success: false, reason: 'Please provice a valid serviceKey' })
        }

        db.findOne({ type: 'service', serviceKey }, (err, doc) => {
            if (!doc) {
                return Promise.reject({ success: false, reason: 'Please provice a valid serviceKey' })
            } else {
                Promise.resolve()
            }
        })
    }
    return Promise.reject({ success: false, reason: 'Please provice a valid serviceKey' })
}
