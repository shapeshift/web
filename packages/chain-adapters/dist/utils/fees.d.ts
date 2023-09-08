import BigNumber from 'bignumber.js';
import type { FeeDataKey } from '../types';
export type ConfirmationSpeed = `${FeeDataKey}`;
export type Fee = string | number | BigNumber;
export type Scalars = Record<ConfirmationSpeed, BigNumber>;
export declare const calcFee: (fee: Fee, speed: ConfirmationSpeed, scalars: Scalars) => string;
