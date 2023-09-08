import type { AssetId } from '@shapeshiftoss/caip';
import type { Message } from '../types';
import type { TxMetadata } from './types';
export declare const getAssetIdByDenom: (denom: string, assetId: string) => AssetId | undefined;
export declare const metaData: (msg: Message, event: Record<string, Record<string, string>>, assetId: string) => TxMetadata | undefined;
