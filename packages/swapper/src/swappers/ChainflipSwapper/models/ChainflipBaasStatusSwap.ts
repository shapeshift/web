// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * Chainflip Broker as a Service
 * Run your own Chainflip Broker without any hassle.
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { ChainflipBaasStatusChunkInfo } from './ChainflipBaasStatusChunkInfo';
import {
    ChainflipBaasStatusChunkInfoFromJSON,
    ChainflipBaasStatusChunkInfoFromJSONTyped,
    ChainflipBaasStatusChunkInfoToJSON,
} from './ChainflipBaasStatusChunkInfo';
import type { ChainflipBaasStatusDca } from './ChainflipBaasStatusDca';
import {
    ChainflipBaasStatusDcaFromJSON,
    ChainflipBaasStatusDcaFromJSONTyped,
    ChainflipBaasStatusDcaToJSON,
} from './ChainflipBaasStatusDca';

/**
 * 
 * @export
 * @interface ChainflipBaasStatusSwap
 */
export interface ChainflipBaasStatusSwap {
    /**
     * 
     * @type {string}
     * @memberof ChainflipBaasStatusSwap
     */
    originalInputAmountNative?: string;
    /**
     * 
     * @type {number}
     * @memberof ChainflipBaasStatusSwap
     */
    originalInputAmount?: number;
    /**
     * 
     * @type {string}
     * @memberof ChainflipBaasStatusSwap
     */
    remainingInputAmountNative?: string;
    /**
     * 
     * @type {number}
     * @memberof ChainflipBaasStatusSwap
     */
    remainingInputAmount?: number;
    /**
     * 
     * @type {string}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedInputAmountNative?: string;
    /**
     * 
     * @type {number}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedInputAmount?: number;
    /**
     * 
     * @type {string}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedIntermediateAmountNative?: string;
    /**
     * 
     * @type {number}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedIntermediateAmount?: number;
    /**
     * 
     * @type {string}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedOutputAmountNative?: string;
    /**
     * 
     * @type {number}
     * @memberof ChainflipBaasStatusSwap
     */
    swappedOutputAmount?: number;
    /**
     * 
     * @type {ChainflipBaasStatusChunkInfo}
     * @memberof ChainflipBaasStatusSwap
     */
    regular?: ChainflipBaasStatusChunkInfo;
    /**
     * 
     * @type {ChainflipBaasStatusDca}
     * @memberof ChainflipBaasStatusSwap
     */
    dca?: ChainflipBaasStatusDca;
}

/**
 * Check if a given object implements the ChainflipBaasStatusSwap interface.
 */
export function instanceOfChainflipBaasStatusSwap(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ChainflipBaasStatusSwapFromJSON(json: any): ChainflipBaasStatusSwap {
    return ChainflipBaasStatusSwapFromJSONTyped(json, false);
}

export function ChainflipBaasStatusSwapFromJSONTyped(json: any, ignoreDiscriminator: boolean): ChainflipBaasStatusSwap {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'originalInputAmountNative': !exists(json, 'originalInputAmountNative') ? undefined : json['originalInputAmountNative'],
        'originalInputAmount': !exists(json, 'originalInputAmount') ? undefined : json['originalInputAmount'],
        'remainingInputAmountNative': !exists(json, 'remainingInputAmountNative') ? undefined : json['remainingInputAmountNative'],
        'remainingInputAmount': !exists(json, 'remainingInputAmount') ? undefined : json['remainingInputAmount'],
        'swappedInputAmountNative': !exists(json, 'swappedInputAmountNative') ? undefined : json['swappedInputAmountNative'],
        'swappedInputAmount': !exists(json, 'swappedInputAmount') ? undefined : json['swappedInputAmount'],
        'swappedIntermediateAmountNative': !exists(json, 'swappedIntermediateAmountNative') ? undefined : json['swappedIntermediateAmountNative'],
        'swappedIntermediateAmount': !exists(json, 'swappedIntermediateAmount') ? undefined : json['swappedIntermediateAmount'],
        'swappedOutputAmountNative': !exists(json, 'swappedOutputAmountNative') ? undefined : json['swappedOutputAmountNative'],
        'swappedOutputAmount': !exists(json, 'swappedOutputAmount') ? undefined : json['swappedOutputAmount'],
        'regular': !exists(json, 'regular') ? undefined : ChainflipBaasStatusChunkInfoFromJSON(json['regular']),
        'dca': !exists(json, 'dca') ? undefined : ChainflipBaasStatusDcaFromJSON(json['dca']),
    };
}

export function ChainflipBaasStatusSwapToJSON(value?: ChainflipBaasStatusSwap | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'originalInputAmountNative': value.originalInputAmountNative,
        'originalInputAmount': value.originalInputAmount,
        'remainingInputAmountNative': value.remainingInputAmountNative,
        'remainingInputAmount': value.remainingInputAmount,
        'swappedInputAmountNative': value.swappedInputAmountNative,
        'swappedInputAmount': value.swappedInputAmount,
        'swappedIntermediateAmountNative': value.swappedIntermediateAmountNative,
        'swappedIntermediateAmount': value.swappedIntermediateAmount,
        'swappedOutputAmountNative': value.swappedOutputAmountNative,
        'swappedOutputAmount': value.swappedOutputAmount,
        'regular': ChainflipBaasStatusChunkInfoToJSON(value.regular),
        'dca': ChainflipBaasStatusDcaToJSON(value.dca),
    };
}
