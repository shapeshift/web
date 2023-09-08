import type { ChainId } from '../../chainId/chainId';
export declare const getSupportedBanxaAssets: () => {
    assetId: string;
    ticker: string;
}[];
export declare const assetIdToBanxaTicker: (assetId: string) => string | undefined;
/**
 * Convert a ChainId to a Banxa chain identifier for use in Banxa HTTP URLs
 *
 * @param {ChainId} chainId - a ChainId
 * @returns {string} - a Banxa chain identifier; e.g., 'cosmos'
 */
export declare const getBanxaBlockchainFromChainId: (chainId: ChainId) => string;
