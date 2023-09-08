"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chainId_1 = require("../chainId/chainId");
const constants_1 = require("../constants");
const accountId_1 = require("./accountId");
describe('toAccountId', () => {
    it('should have matching CAIP10 aliases', () => {
        expect(accountId_1.toAccountId).toEqual(accountId_1.toCAIP10);
        expect(accountId_1.fromAccountId).toEqual(accountId_1.fromCAIP10);
    });
    it('throws on invalid chainId', () => {
        const chainNamespace = 'eeep';
        const chainReference = '123';
        const chainId = `${chainNamespace}:${chainReference}`;
        const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535';
        expect(() => (0, accountId_1.toAccountId)({ chainId, account })).toThrow();
        expect(() => (0, accountId_1.toAccountId)({ chainNamespace, chainReference, account })).toThrow();
    });
    it('throws on empty account', () => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        const chainId = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
        const account = '';
        expect(() => (0, accountId_1.toAccountId)({ chainId, account })).toThrow();
        expect(() => (0, accountId_1.toAccountId)({ chainNamespace, chainReference, account })).toThrow();
    });
    it('accepts valid eth chainId and account', () => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        const chainId = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
        const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535';
        const expectedAccountId = `${chainId}:${account}`;
        expect((0, accountId_1.toAccountId)({ chainId, account })).toEqual(expectedAccountId);
        expect((0, accountId_1.toAccountId)({ chainNamespace, chainReference, account })).toEqual(expectedAccountId);
    });
    it('lowercases eth address', () => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        const chainId = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
        const account = '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535';
        const expectedAccountId = `${chainId}:${account.toLowerCase()}`;
        expect((0, accountId_1.toAccountId)({ chainId, account })).toEqual(expectedAccountId);
        expect((0, accountId_1.toAccountId)({ chainNamespace, chainReference, account })).toEqual(expectedAccountId);
    });
    it('does not lowercase bitcoin account', () => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
        const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
        const chainId = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
        const account = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn';
        const expectedAccountId = `${chainId}:${account}`;
        expect((0, accountId_1.toAccountId)({ chainId, account })).toEqual(expectedAccountId);
        expect((0, accountId_1.toAccountId)({ chainNamespace, chainReference, account })).toEqual(expectedAccountId);
    });
});
describe('fromAccountId', () => {
    it('throws on empty string', () => {
        const accountId = '';
        expect(() => (0, accountId_1.fromAccountId)(accountId)).toThrow();
    });
    it('returns chainId and account for bitcoin', () => {
        const accountId = 'bip122:000000000019d6689c085ae165831e93:327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn';
        const { account, chainId, chainNamespace, chainReference } = (0, accountId_1.fromAccountId)(accountId);
        const expectedAccount = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn';
        const expectedChainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
        const expectedChainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
        expect(account).toEqual(expectedAccount);
        expect(chainNamespace).toEqual(expectedChainNamespace);
        expect(chainReference).toEqual(expectedChainReference);
        expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`);
    });
    it('returns chainId and account for dogecoin', () => {
        const accountId = 'bip122:00000000001a91e3dace36e2be3bf030:DDFrdu2AyWCkgpdypkABTnL6FWBGKSAL8V';
        const { account, chainId, chainNamespace, chainReference } = (0, accountId_1.fromAccountId)(accountId);
        const expectedAccount = 'DDFrdu2AyWCkgpdypkABTnL6FWBGKSAL8V';
        const expectedChainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
        const expectedChainReference = constants_1.CHAIN_REFERENCE.DogecoinMainnet;
        expect(account).toEqual(expectedAccount);
        expect(chainNamespace).toEqual(expectedChainNamespace);
        expect(chainReference).toEqual(expectedChainReference);
        expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`);
    });
    it('returns chainId and account for eth', () => {
        const accountId = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535';
        const { account, chainId, chainNamespace, chainReference } = (0, accountId_1.fromAccountId)(accountId);
        const expectedAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535';
        const expectedChainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const expectedChainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        expect(account).toEqual(expectedAccount);
        expect(chainNamespace).toEqual(expectedChainNamespace);
        expect(chainReference).toEqual(expectedChainReference);
        expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`);
    });
    it('lowercases eth account', () => {
        const accountId = 'eip155:1:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535';
        const { account, chainId, chainNamespace, chainReference } = (0, accountId_1.fromAccountId)(accountId);
        const expectedAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535';
        const expectedChainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const expectedChainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        expect(account).toEqual(expectedAccount);
        expect(chainNamespace).toEqual(expectedChainNamespace);
        expect(chainReference).toEqual(expectedChainReference);
        expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`);
    });
    it('throws on empty account', () => {
        const accountId = 'eip155:1:';
        expect(() => (0, accountId_1.fromAccountId)(accountId)).toThrow();
    });
});
