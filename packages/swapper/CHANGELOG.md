# [@shapeshiftoss/swapper-v11.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v11.1.0...@shapeshiftoss/swapper-v11.1.1) (2022-09-15)


### Bug Fixes

* **swapper:** keepkey cow swap problem ([#1019](https://github.com/shapeshift/lib/issues/1019)) ([0359d8d](https://github.com/shapeshift/lib/commit/0359d8d4b8b08fd8967835b69cc4aa7ed75c1156))

# [@shapeshiftoss/swapper-v11.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v11.0.3...@shapeshiftoss/swapper-v11.1.0) (2022-09-12)


### Features

* add THORChain support ([#1010](https://github.com/shapeshift/lib/issues/1010)) ([d7c3b72](https://github.com/shapeshift/lib/commit/d7c3b72bbda9795f87fa8f73c35926c95026a3c2))

# [@shapeshiftoss/swapper-v11.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v11.0.2...@shapeshiftoss/swapper-v11.0.3) (2022-09-09)

# [@shapeshiftoss/swapper-v11.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v11.0.1...@shapeshiftoss/swapper-v11.0.2) (2022-09-06)


### Bug Fixes

* **swapper:** minimum one dollar trade fee ([#994](https://github.com/shapeshift/lib/issues/994)) ([e08194f](https://github.com/shapeshift/lib/commit/e08194f91a50edbf2e203f59f32b9918c6fc7d66))

# [@shapeshiftoss/swapper-v11.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v11.0.0...@shapeshiftoss/swapper-v11.0.1) (2022-09-02)

# [@shapeshiftoss/swapper-v11.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v10.0.0...@shapeshiftoss/swapper-v11.0.0) (2022-09-02)


### Features

* use CHAIN_NAMESPACE.Evm & CHAIN_NAMESPACE.CosmosSdk ([#1007](https://github.com/shapeshift/lib/issues/1007)) ([b6c5490](https://github.com/shapeshift/lib/commit/b6c54902c9e84fd628e917e4747acdb6faf3405d)), closes [#1008](https://github.com/shapeshift/lib/issues/1008)


### BREAKING CHANGES

* CHAIN_NAMESPACE.Ethereum is now CHAIN_NAMESPACE.Evm
* CHAIN_NAMESPACE.Cosmos is now CHAIN_NAMESPACE.CosmosSdk

* chore: trigger CI

* chore: trigger ci

* fix: internally bump caip

Co-authored-by: Apotheosis <97164662+0xApotheosis@users.noreply.github.com>

# [@shapeshiftoss/swapper-v10.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.17.1...@shapeshiftoss/swapper-v10.0.0) (2022-09-01)


### Features

* rename CHAIN_NAMESPACE.Bitcoin -> CHAIN_NAMESPACE.Utxo ([#1006](https://github.com/shapeshift/lib/issues/1006)) ([cbb1fbf](https://github.com/shapeshift/lib/commit/cbb1fbfbb30ec81b96f65dab1f8748f07a3d98fd))


### BREAKING CHANGES

* CHAIN_NAMESPACE.Bitcoin is now CHAIN_NAMESPACE.Utxo

This renames CHAIN_NAMESPACE.Bitcoin to CHAIN_NAMESPACE.Utxo since it
now refers to any UTXO chain

# [@shapeshiftoss/swapper-v9.17.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.17.0...@shapeshiftoss/swapper-v9.17.1) (2022-08-26)


### Bug Fixes

* osmo: calculate finish tx off second tx in transaction ([#990](https://github.com/shapeshift/lib/issues/990)) ([a879550](https://github.com/shapeshift/lib/commit/a8795501642b1ba6603c43c165f011f257b21e25))

# [@shapeshiftoss/swapper-v9.17.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.16.2...@shapeshiftoss/swapper-v9.17.0) (2022-08-25)


### Features

* **swapper:** serialize `GetTradeQuoteInput` type args ([#989](https://github.com/shapeshift/lib/issues/989)) ([40ec11f](https://github.com/shapeshift/lib/commit/40ec11f6b9dbee9d2d13c809aaca9c3e62a1899f))

# [@shapeshiftoss/swapper-v9.16.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.16.1...@shapeshiftoss/swapper-v9.16.2) (2022-08-16)


### Bug Fixes

* off-by-one allowance check ([#979](https://github.com/shapeshift/lib/issues/979)) ([50dd012](https://github.com/shapeshift/lib/commit/50dd012b19da4b47d9b48750c708717982dde678))

# [@shapeshiftoss/swapper-v9.16.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.16.0...@shapeshiftoss/swapper-v9.16.1) (2022-08-15)

# [@shapeshiftoss/swapper-v9.16.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.15.1...@shapeshiftoss/swapper-v9.16.0) (2022-08-15)


### Features

* implement CowSwap approveAmount method ([#976](https://github.com/shapeshift/lib/issues/976)) ([e777dba](https://github.com/shapeshift/lib/commit/e777dbab4c1caebf62e6f0cca4e8547c356fc325))

# [@shapeshiftoss/swapper-v9.15.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.15.0...@shapeshiftoss/swapper-v9.15.1) (2022-08-15)

# [@shapeshiftoss/swapper-v9.15.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.14.0...@shapeshiftoss/swapper-v9.15.0) (2022-08-14)


### Features

* **swapper:** add approveAmount swapper API method ([#962](https://github.com/shapeshift/lib/issues/962)) ([8bf11b1](https://github.com/shapeshift/lib/commit/8bf11b15939d437b4fdd5668e75407d5ede931c8))

# [@shapeshiftoss/swapper-v9.14.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.13.0...@shapeshiftoss/swapper-v9.14.0) (2022-08-12)


### Features

* no fee on osmo swapper txs ([#968](https://github.com/shapeshift/lib/issues/968)) ([72d9a96](https://github.com/shapeshift/lib/commit/72d9a966cccdd41742d7b8d44f38584c731d48d4))

# [@shapeshiftoss/swapper-v9.13.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.12.1...@shapeshiftoss/swapper-v9.13.0) (2022-08-12)


### Features

* **swapper:** add TRADE_QUOTE_AMOUNT_TOO_SMALL error ([#970](https://github.com/shapeshift/lib/issues/970)) ([f4cab36](https://github.com/shapeshift/lib/commit/f4cab3691f5ef85af159b6e766c1a1e62175fa07))

# [@shapeshiftoss/swapper-v9.12.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.12.0...@shapeshiftoss/swapper-v9.12.1) (2022-08-12)


### Bug Fixes

* **swapper:** thorchainSwapper quote inversion ([#969](https://github.com/shapeshift/lib/issues/969)) ([150e041](https://github.com/shapeshift/lib/commit/150e041e866e92eb39fdc0978c4de541eb0ea2d6))

# [@shapeshiftoss/swapper-v9.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.11.1...@shapeshiftoss/swapper-v9.12.0) (2022-08-11)


### Features

* **cowSwapper:** handle SellAmountDoesNotCoverFee Cow.fi error ([#965](https://github.com/shapeshift/lib/issues/965)) ([c69fad3](https://github.com/shapeshift/lib/commit/c69fad3ac8a486c707ca77862859b78ce86e4ca2))

# [@shapeshiftoss/swapper-v9.11.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.11.0...@shapeshiftoss/swapper-v9.11.1) (2022-08-11)


### Bug Fixes

* osmo parser fixes ([#948](https://github.com/shapeshift/lib/issues/948)) ([cd1db39](https://github.com/shapeshift/lib/commit/cd1db3942a55e01e674bdededbcede2b0b787863))

# [@shapeshiftoss/swapper-v9.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.10.1...@shapeshiftoss/swapper-v9.11.0) (2022-08-11)


### Features

* **swapper:** populate CowSwap `sellTxid` ([#964](https://github.com/shapeshift/lib/issues/964)) ([df0d66e](https://github.com/shapeshift/lib/commit/df0d66ea3c0b22dd17af190189281cbe2a8facc5))

# [@shapeshiftoss/swapper-v9.10.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.10.0...@shapeshiftoss/swapper-v9.10.1) (2022-08-10)


### Bug Fixes

* always return 0 tradeFee for cow swaps ([#963](https://github.com/shapeshift/lib/issues/963)) ([e388614](https://github.com/shapeshift/lib/commit/e38861494ccf09c600e2218a95bacc08de8ab359))

# [@shapeshiftoss/swapper-v9.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.9.0...@shapeshiftoss/swapper-v9.10.0) (2022-08-10)


### Features

* thorswap utxo support ([#949](https://github.com/shapeshift/lib/issues/949)) ([1f63ad9](https://github.com/shapeshift/lib/commit/1f63ad9fe2870472ad6ca5a70d652743d3c1c9ee))

# [@shapeshiftoss/swapper-v9.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.8.0...@shapeshiftoss/swapper-v9.9.0) (2022-08-08)


### Features

* cowswap app data ([#956](https://github.com/shapeshift/lib/issues/956)) ([ea6b596](https://github.com/shapeshift/lib/commit/ea6b59652437ab744bfa92aa7823fd8ca38b5bcf))

# [@shapeshiftoss/swapper-v9.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.7.0...@shapeshiftoss/swapper-v9.8.0) (2022-08-08)


### Features

* **swapper:** add isCowTrade typeguard ([#954](https://github.com/shapeshift/lib/issues/954)) ([6d337af](https://github.com/shapeshift/lib/commit/6d337afca8d21fd9be1d98725dc893dc3d113870))

# [@shapeshiftoss/swapper-v9.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.6.1...@shapeshiftoss/swapper-v9.7.0) (2022-08-08)


### Features

* **swapper:** export CowSwapper types ([#953](https://github.com/shapeshift/lib/issues/953)) ([1ccab10](https://github.com/shapeshift/lib/commit/1ccab10051cb45e4fcb9d86dc021c67d7c91283a))

# [@shapeshiftoss/swapper-v9.6.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.6.0...@shapeshiftoss/swapper-v9.6.1) (2022-08-04)


### Bug Fixes

* fix bch swaps and fix detecting swaps into eth assets ([#945](https://github.com/shapeshift/lib/issues/945)) ([1d9b8d8](https://github.com/shapeshift/lib/commit/1d9b8d8b0cae1ea2bba92f737c8851d43f222c36))

# [@shapeshiftoss/swapper-v9.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.5.0...@shapeshiftoss/swapper-v9.6.0) (2022-08-03)


### Features

* detect completed txs and throw error on fail ([#939](https://github.com/shapeshift/lib/issues/939)) ([f85e1fb](https://github.com/shapeshift/lib/commit/f85e1fbbda37da37849a154693a64a5e6c4aa35f))

# [@shapeshiftoss/swapper-v9.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.4.0...@shapeshiftoss/swapper-v9.5.0) (2022-08-02)


### Features

* atom thorchain support ([#938](https://github.com/shapeshift/lib/issues/938)) ([86296d1](https://github.com/shapeshift/lib/commit/86296d1ebf3ba57cdc462e1c95e46b122230b881))

# [@shapeshiftoss/swapper-v9.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.3.2...@shapeshiftoss/swapper-v9.4.0) (2022-08-02)


### Features

* additonal thorchain asset support ([#935](https://github.com/shapeshift/lib/issues/935)) ([0b1a492](https://github.com/shapeshift/lib/commit/0b1a492b4f6c1f69674f3114f284caa0b5b8e1ce))

# [@shapeshiftoss/swapper-v9.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.3.1...@shapeshiftoss/swapper-v9.3.2) (2022-08-02)


### Bug Fixes

* enables ETH as buy asset for CowSwap ([#928](https://github.com/shapeshift/lib/issues/928)) ([59d7469](https://github.com/shapeshift/lib/commit/59d74697c87c3adaba54753f6df283976f510ad1))

# [@shapeshiftoss/swapper-v9.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.3.0...@shapeshiftoss/swapper-v9.3.1) (2022-08-01)

# [@shapeshiftoss/swapper-v9.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.2.3...@shapeshiftoss/swapper-v9.3.0) (2022-08-01)


### Features

* **caip:** remove getFeeAssetIdFromAssetId / chainIdToAssetId ([#908](https://github.com/shapeshift/lib/issues/908)) ([d5cfda5](https://github.com/shapeshift/lib/commit/d5cfda5d037e7d1d7a3a4d4b522ec2a5ee8f4ac5))

# [@shapeshiftoss/swapper-v9.2.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.2.2...@shapeshiftoss/swapper-v9.2.3) (2022-08-01)


### Bug Fixes

* prevent user from cow swapping with small sell amount ([#927](https://github.com/shapeshift/lib/issues/927)) ([27c1b30](https://github.com/shapeshift/lib/commit/27c1b30dbce3d41cbcb9c91a1ef51b47ac6509dc))

# [@shapeshiftoss/swapper-v9.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.2.1...@shapeshiftoss/swapper-v9.2.2) (2022-08-01)


### Bug Fixes

* use fee asset instead of asset in calculation ([#930](https://github.com/shapeshift/lib/issues/930)) ([fa836e4](https://github.com/shapeshift/lib/commit/fa836e40c8d264a7d8746dc86c690fd87d83465b))

# [@shapeshiftoss/swapper-v9.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.2.0...@shapeshiftoss/swapper-v9.2.1) (2022-07-29)

# [@shapeshiftoss/swapper-v9.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.1.1...@shapeshiftoss/swapper-v9.2.0) (2022-07-29)


### Features

* replace '/api/v1/market' call with '/api/v1/quote' in getUsdRate ([#916](https://github.com/shapeshift/lib/issues/916)) ([23816aa](https://github.com/shapeshift/lib/commit/23816aaf3d08a76c04e0723b86ac4fbf122c6921))

# [@shapeshiftoss/swapper-v9.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.1.0...@shapeshiftoss/swapper-v9.1.1) (2022-07-28)

# [@shapeshiftoss/swapper-v9.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.0.1...@shapeshiftoss/swapper-v9.1.0) (2022-07-27)


### Features

* build thor trade ([#895](https://github.com/shapeshift/lib/issues/895)) ([d3cfe4c](https://github.com/shapeshift/lib/commit/d3cfe4c6c4d384e4f9343487c26ec8ea47a68ab3))

# [@shapeshiftoss/swapper-v9.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v9.0.0...@shapeshiftoss/swapper-v9.0.1) (2022-07-26)


### Bug Fixes

* unrug lib bump packages ([#910](https://github.com/shapeshift/lib/issues/910)) ([c914e58](https://github.com/shapeshift/lib/commit/c914e58a2832e5bc196d062074499ec46a200d50))

# [@shapeshiftoss/swapper-v9.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.7.1...@shapeshiftoss/swapper-v9.0.0) (2022-07-26)


### Features

* **types:** export Asset type from asset-service ([#893](https://github.com/shapeshift/lib/issues/893)) ([616ea72](https://github.com/shapeshift/lib/commit/616ea72573dd7a3a91a9233d83f8936b43ca0ed7))


### BREAKING CHANGES

* **types:** Asset is now exported from asset-service, and all consumers should now import it from it

* fix: tests Asset type imports

# [@shapeshiftoss/swapper-v8.7.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.7.0...@shapeshiftoss/swapper-v8.7.1) (2022-07-25)

# [@shapeshiftoss/swapper-v8.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.6.1...@shapeshiftoss/swapper-v8.7.0) (2022-07-25)


### Features

* **swapper:** support all evm chains in `getZrxMinMax` ([#902](https://github.com/shapeshift/lib/issues/902)) ([e97be16](https://github.com/shapeshift/lib/commit/e97be165862f9402437c7539d699f5ed2c3990a7))

# [@shapeshiftoss/swapper-v8.6.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.6.0...@shapeshiftoss/swapper-v8.6.1) (2022-07-25)

# [@shapeshiftoss/swapper-v8.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.5.3...@shapeshiftoss/swapper-v8.6.0) (2022-07-22)


### Features

* cowswap executeTrade and getTradeTxs methods ([#868](https://github.com/shapeshift/lib/issues/868)) ([b9ce707](https://github.com/shapeshift/lib/commit/b9ce7070d3f3a5d70464c57efc488c7a2604e3dc))

# [@shapeshiftoss/swapper-v8.5.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.5.2...@shapeshiftoss/swapper-v8.5.3) (2022-07-22)


### Bug Fixes

* silently fail if a swapper has already been added instead of throwing ([#898](https://github.com/shapeshift/lib/issues/898)) ([67a6143](https://github.com/shapeshift/lib/commit/67a614363684d77f6c28e6f9875249bacd5bff62))

# [@shapeshiftoss/swapper-v8.5.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.5.1...@shapeshiftoss/swapper-v8.5.2) (2022-07-21)


### Bug Fixes

* **swapper:** filtering by assets ([#896](https://github.com/shapeshift/lib/issues/896)) ([2df27cb](https://github.com/shapeshift/lib/commit/2df27cbca6b3ea5f5a28bdfd40e0a7fee24b1714))

# [@shapeshiftoss/swapper-v8.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.5.0...@shapeshiftoss/swapper-v8.5.1) (2022-07-19)


### Bug Fixes

* account fix ([#891](https://github.com/shapeshift/lib/issues/891)) ([aeec53c](https://github.com/shapeshift/lib/commit/aeec53c15fdd4be38bdae72f832fb957989d64f1))

# [@shapeshiftoss/swapper-v8.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.4.0...@shapeshiftoss/swapper-v8.5.0) (2022-07-18)


### Features

* **swapper:** osmosis swapper ([#865](https://github.com/shapeshift/lib/issues/865)) ([585dec6](https://github.com/shapeshift/lib/commit/585dec6d49b4a9756a7a344986468dc16776454f))

# [@shapeshiftoss/swapper-v8.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.3.1...@shapeshiftoss/swapper-v8.4.0) (2022-07-15)


### Features

* **swapper:** use hardcoded gas limit in grantAllowance ([#874](https://github.com/shapeshift/lib/issues/874)) ([b311d5b](https://github.com/shapeshift/lib/commit/b311d5be9268ec47d2f6aebbc158827b385b406f))

# [@shapeshiftoss/swapper-v8.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.3.0...@shapeshiftoss/swapper-v8.3.1) (2022-07-15)


### Bug Fixes

* trade fee and minimum ([#881](https://github.com/shapeshift/lib/issues/881)) ([b94d41d](https://github.com/shapeshift/lib/commit/b94d41d45032d0280dda201b0e04840ff35540ab))
* **swapper:** fix filterBuyAssetsBySellAssetId for thorchain ([#879](https://github.com/shapeshift/lib/issues/879)) ([83cdead](https://github.com/shapeshift/lib/commit/83cdead80c2ab03bb154a240e4d03227f9be5246))

# [@shapeshiftoss/swapper-v8.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.2.0...@shapeshiftoss/swapper-v8.3.0) (2022-07-14)


### Features

* thor btcquote ([#840](https://github.com/shapeshift/lib/issues/840)) ([b127077](https://github.com/shapeshift/lib/commit/b1270772b5e7ff9442761d1afeffc028e7e23105))

# [@shapeshiftoss/swapper-v8.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.1.0...@shapeshiftoss/swapper-v8.2.0) (2022-07-11)


### Features

* cowswap buildTrade ([#846](https://github.com/shapeshift/lib/issues/846)) ([a57520c](https://github.com/shapeshift/lib/commit/a57520cb415358240c71164197651e67e1a05ab6))

# [@shapeshiftoss/swapper-v8.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.0.1...@shapeshiftoss/swapper-v8.1.0) (2022-07-11)


### Features

* **swapper:** repurpose 'swapperName' to be human readable name for each swapper ([#867](https://github.com/shapeshift/lib/issues/867)) ([ff23df8](https://github.com/shapeshift/lib/commit/ff23df894d9d70c4786b1ebf576b9987b9c89405))

# [@shapeshiftoss/swapper-v8.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v8.0.0...@shapeshiftoss/swapper-v8.0.1) (2022-07-07)

# [@shapeshiftoss/swapper-v8.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.9.1...@shapeshiftoss/swapper-v8.0.0) (2022-07-07)


### Features

* **swapper:** refactor + genericize 0x swapper to support any EVM ([#850](https://github.com/shapeshift/lib/issues/850)) ([094c684](https://github.com/shapeshift/lib/commit/094c684297666bc4b78e7eb1805dbeed6e6e69b1))


### BREAKING CHANGES

* **swapper:** SwapperType has been removed from @shapeshiftoss/types and will instead need to be imported from @shaperhiftoss/swapper.

* fix: correct import

* chore: remove redundant swapperType arg

* chore: update tests for removed arg

* fix: CLI tool and docs

* feat: discriminate swapperType by chainId

* chore: nest swapper-specific types

* Revert "chore: remove deprecated getSwapper method"

This reverts commit 5591f9e358a96b6524f395b17f893614b37e51d6.

* fix: reversion issues

* chore: improve types

* chore: use EvmSupportedChainIds

* chore: improve generics

* propagate generics through and add extra types

Co-authored-by: kaladinlight <35275952+kaladinlight@users.noreply.github.com>

# [@shapeshiftoss/swapper-v7.9.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.9.0...@shapeshiftoss/swapper-v7.9.1) (2022-07-07)

# [@shapeshiftoss/swapper-v7.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.8.2...@shapeshiftoss/swapper-v7.9.0) (2022-07-07)


### Features

* **swapper:** make initialize swapper method optional ([#859](https://github.com/shapeshift/lib/issues/859)) ([026ba86](https://github.com/shapeshift/lib/commit/026ba866e71dc95352338d85fe712942413856b7))

# [@shapeshiftoss/swapper-v7.8.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.8.1...@shapeshiftoss/swapper-v7.8.2) (2022-06-30)


### Bug Fixes

* **swapper:** use best practice naming conventions ([#848](https://github.com/shapeshift/lib/issues/848)) ([092255c](https://github.com/shapeshift/lib/commit/092255cbde52abab5e6a14ed82781eb70560dd09))

# [@shapeshiftoss/swapper-v7.8.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.8.0...@shapeshiftoss/swapper-v7.8.1) (2022-06-29)

# [@shapeshiftoss/swapper-v7.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.7.1...@shapeshiftoss/swapper-v7.8.0) (2022-06-29)


### Features

* **swapper:** cowswap get trade quote method implementation ([#796](https://github.com/shapeshift/lib/issues/796)) ([3d4c334](https://github.com/shapeshift/lib/commit/3d4c334fd0053b53db9d63593a862efe62c5f4c7))

# [@shapeshiftoss/swapper-v7.7.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.7.0...@shapeshiftoss/swapper-v7.7.1) (2022-06-16)

# [@shapeshiftoss/swapper-v7.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.6.0...@shapeshiftoss/swapper-v7.7.0) (2022-06-16)


### Features

* thorswap approve infinite ([#822](https://github.com/shapeshift/lib/issues/822)) ([3a69efe](https://github.com/shapeshift/lib/commit/3a69efe26453855c525d4554b216d3e7091146a8))

# [@shapeshiftoss/swapper-v7.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.5.1...@shapeshiftoss/swapper-v7.6.0) (2022-06-16)


### Features

* quote trade input string union discrimination ([#829](https://github.com/shapeshift/lib/issues/829)) ([409a06e](https://github.com/shapeshift/lib/commit/409a06e534a412ff3fddd93cc08799967790d812))

# [@shapeshiftoss/swapper-v7.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.5.0...@shapeshiftoss/swapper-v7.5.1) (2022-06-15)


### Bug Fixes

* type ([#825](https://github.com/shapeshift/lib/issues/825)) ([34ec284](https://github.com/shapeshift/lib/commit/34ec284c8d55baf7c73d7ef33669e1a996b8fedb))

# [@shapeshiftoss/swapper-v7.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.4.0...@shapeshiftoss/swapper-v7.5.0) (2022-06-15)


### Features

* maketrade work with either gasprice or eip1559 ([#824](https://github.com/shapeshift/lib/issues/824)) ([619a940](https://github.com/shapeshift/lib/commit/619a940c0ceec4021e3840b8787580df853d13a2))

# [@shapeshiftoss/swapper-v7.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.3.1...@shapeshiftoss/swapper-v7.4.0) (2022-06-15)


### Features

* btc thor trade fees ([#823](https://github.com/shapeshift/lib/issues/823)) ([e9f93cd](https://github.com/shapeshift/lib/commit/e9f93cd675492aef5c903f3e254cf51a147d8971))

# [@shapeshiftoss/swapper-v7.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.3.0...@shapeshiftoss/swapper-v7.3.1) (2022-06-15)

# [@shapeshiftoss/swapper-v7.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.2.1...@shapeshiftoss/swapper-v7.3.0) (2022-06-14)


### Features

* add thorswap approvalNeeded ([#801](https://github.com/shapeshift/lib/issues/801)) ([4902ac4](https://github.com/shapeshift/lib/commit/4902ac453121d7700195662b2ca8ed9a1645d362))

# [@shapeshiftoss/swapper-v7.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.2.0...@shapeshiftoss/swapper-v7.2.1) (2022-06-13)


### Bug Fixes

* add unchained-client devDependencies ([#804](https://github.com/shapeshift/lib/issues/804)) ([809fbda](https://github.com/shapeshift/lib/commit/809fbdae899ab4d8aecc021baa8df8162aae7d86))

# [@shapeshiftoss/swapper-v7.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.1.0...@shapeshiftoss/swapper-v7.2.0) (2022-06-13)


### Features

* cowswap approval needed approve infinite ([#771](https://github.com/shapeshift/lib/issues/771)) ([9cf3700](https://github.com/shapeshift/lib/commit/9cf3700e8fa4abe139df0d94c106c1266fd076f1))

# [@shapeshiftoss/swapper-v7.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v7.0.0...@shapeshiftoss/swapper-v7.1.0) (2022-06-10)


### Features

* cowswap getcowswapminmax and filtering methods implementation ([#757](https://github.com/shapeshift/lib/issues/757)) ([d58e1c1](https://github.com/shapeshift/lib/commit/d58e1c1fd9503811e2f365d1d5d70cd541e8366b))

# [@shapeshiftoss/swapper-v7.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.3.0...@shapeshiftoss/swapper-v7.0.0) (2022-06-10)


### Features

* **swapper:** remove usage of "ChainTypes" ([#782](https://github.com/shapeshift/lib/issues/782)) ([9a548c9](https://github.com/shapeshift/lib/commit/9a548c981139fc551838763c2e1c59dfde853698))


### BREAKING CHANGES

* **swapper:** replace usage of ChainTypes with ChainId

# [@shapeshiftoss/swapper-v6.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.2.1...@shapeshiftoss/swapper-v6.3.0) (2022-06-09)


### Features

* thorswap get trade quote ([#765](https://github.com/shapeshift/lib/issues/765)) ([a643be3](https://github.com/shapeshift/lib/commit/a643be3c74183d0c67100e6f288fc957db0cba45))

# [@shapeshiftoss/swapper-v6.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.2.0...@shapeshiftoss/swapper-v6.2.1) (2022-06-09)


### Bug Fixes

* change asset account number name and type ([#775](https://github.com/shapeshift/lib/issues/775)) ([5b62783](https://github.com/shapeshift/lib/commit/5b62783661e7ade1a5d00de28ca75db82e9e10a8))

# [@shapeshiftoss/swapper-v6.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.1.0...@shapeshiftoss/swapper-v6.2.0) (2022-06-08)


### Features

* thorchain price calculation ([#763](https://github.com/shapeshift/lib/issues/763)) ([8f42b6d](https://github.com/shapeshift/lib/commit/8f42b6db48dfc92b3ad44687387434c09bbc95f2))

# [@shapeshiftoss/swapper-v6.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.0.1...@shapeshiftoss/swapper-v6.1.0) (2022-06-08)


### Features

* thorchain eth execute trade support ([#766](https://github.com/shapeshift/lib/issues/766)) ([4455e4d](https://github.com/shapeshift/lib/commit/4455e4d149c3ca56b19cfad1b6b1f5430243bd8e))

# [@shapeshiftoss/swapper-v6.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v6.0.0...@shapeshiftoss/swapper-v6.0.1) (2022-06-08)

# [@shapeshiftoss/swapper-v6.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.12.1...@shapeshiftoss/swapper-v6.0.0) (2022-06-08)


### Features

* update btc/eth to use historical tx history and new ws payloads ([#674](https://github.com/shapeshift/lib/issues/674)) ([0189e3b](https://github.com/shapeshift/lib/commit/0189e3b4dd5a3b998ddf285e761ae11dea72f94b))


### BREAKING CHANGES

* unchained-client and chain-adapters

* revert pre release package versions

* revert changes to no breaking packages

* dependencies

* pin package versions

# [@shapeshiftoss/swapper-v5.12.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.12.0...@shapeshiftoss/swapper-v5.12.1) (2022-06-08)

# [@shapeshiftoss/swapper-v5.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.11.0...@shapeshiftoss/swapper-v5.12.0) (2022-06-07)


### Features

* implements getUsdRate method ([#733](https://github.com/shapeshift/lib/issues/733)) ([36b27f1](https://github.com/shapeshift/lib/commit/36b27f1cbef5bcf929005d93885adf5f058ac21c))

# [@shapeshiftoss/swapper-v5.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.10.2...@shapeshiftoss/swapper-v5.11.0) (2022-06-07)


### Features

* function to estimate thor trade fees ([#756](https://github.com/shapeshift/lib/issues/756)) ([3d052c6](https://github.com/shapeshift/lib/commit/3d052c6d5c798c441371b5f05ac7901ea2d9c432))

# [@shapeshiftoss/swapper-v5.10.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.10.1...@shapeshiftoss/swapper-v5.10.2) (2022-06-06)


### Bug Fixes

* filter out thorchain assets for chains that the swapper does not yet support ([#754](https://github.com/shapeshift/lib/issues/754)) ([972a9f7](https://github.com/shapeshift/lib/commit/972a9f714a27eab262b09e2ee2b6daa56494aa28))

# [@shapeshiftoss/swapper-v5.10.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.10.0...@shapeshiftoss/swapper-v5.10.1) (2022-06-06)

# [@shapeshiftoss/swapper-v5.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.9.0...@shapeshiftoss/swapper-v5.10.0) (2022-06-03)


### Features

* **swapper:** consume normalization of Asset properties ([#744](https://github.com/shapeshift/lib/issues/744)) ([cdf8ae8](https://github.com/shapeshift/lib/commit/cdf8ae8d3c0a276d172410d0e0860cc8e400034b))

# [@shapeshiftoss/swapper-v5.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.8.1...@shapeshiftoss/swapper-v5.9.0) (2022-06-03)


### Features

* **assetService:** consume normalization of Asset properties & use static data ([#746](https://github.com/shapeshift/lib/issues/746)) ([ca87bee](https://github.com/shapeshift/lib/commit/ca87bee46419a03d490a826b2b42c90b49cc3079))

# [@shapeshiftoss/swapper-v5.8.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.8.0...@shapeshiftoss/swapper-v5.8.1) (2022-06-03)

# [@shapeshiftoss/swapper-v5.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.7.0...@shapeshiftoss/swapper-v5.8.0) (2022-06-03)


### Features

* eth make trade tx utility ([#742](https://github.com/shapeshift/lib/issues/742)) ([180ed39](https://github.com/shapeshift/lib/commit/180ed398e8cf8700825071893116a8b5f9f38ef9))

# [@shapeshiftoss/swapper-v5.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.6.0...@shapeshiftoss/swapper-v5.7.0) (2022-06-02)


### Features

* add getUsdRate for thorchainSwapper ([#737](https://github.com/shapeshift/lib/issues/737)) ([f629780](https://github.com/shapeshift/lib/commit/f62978047f95670672cc8d948b3e2981cc3362c7))

# [@shapeshiftoss/swapper-v5.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.5.0...@shapeshiftoss/swapper-v5.6.0) (2022-06-02)


### Features

* get call data for router deposit call ([#739](https://github.com/shapeshift/lib/issues/739)) ([807e547](https://github.com/shapeshift/lib/commit/807e547a02928f6d4aac03599ba386ab6efc9ced))

# [@shapeshiftoss/swapper-v5.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.4.0...@shapeshiftoss/swapper-v5.5.0) (2022-06-02)


### Features

* implements cowswapper skeleton ([#732](https://github.com/shapeshift/lib/issues/732)) ([dd6e935](https://github.com/shapeshift/lib/commit/dd6e9357a0f97e23a50c0b51a9dd2d9ec07b2d1b))

# [@shapeshiftoss/swapper-v5.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.3.0...@shapeshiftoss/swapper-v5.4.0) (2022-06-01)


### Features

* implement initialize, filterBuyAssetsBySellAssetId, and filterAssetIdsBySellable method for ThorchainSwapper ([#708](https://github.com/shapeshift/lib/issues/708)) ([19eae25](https://github.com/shapeshift/lib/commit/19eae258ce6363abb79337b699a84951dc548ba6))
* thor trade types for eth or btc tx data ([#730](https://github.com/shapeshift/lib/issues/730)) ([2591230](https://github.com/shapeshift/lib/commit/259123080c9acbea93e9fbc673bf3aac5763a9c7))

# [@shapeshiftoss/swapper-v5.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.2.3...@shapeshiftoss/swapper-v5.3.0) (2022-06-01)


### Features

* thorchain memo support ([#716](https://github.com/shapeshift/lib/issues/716)) ([fe9762f](https://github.com/shapeshift/lib/commit/fe9762fd7656ef17d93885ff154a991978c3e93b))

# [@shapeshiftoss/swapper-v5.2.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.2.2...@shapeshiftoss/swapper-v5.2.3) (2022-05-31)


### Bug Fixes

* use mainnet btc for test swapper ([#701](https://github.com/shapeshift/lib/issues/701)) ([471621f](https://github.com/shapeshift/lib/commit/471621f8adcac707dc2c5606c036945539dec1ff))

# [@shapeshiftoss/swapper-v5.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.2.1...@shapeshiftoss/swapper-v5.2.2) (2022-05-31)

# [@shapeshiftoss/swapper-v5.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.2.0...@shapeshiftoss/swapper-v5.2.1) (2022-05-26)

# [@shapeshiftoss/swapper-v5.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.5...@shapeshiftoss/swapper-v5.2.0) (2022-05-26)


### Features

* thorswapper initialize ([#703](https://github.com/shapeshift/lib/issues/703)) ([73cc081](https://github.com/shapeshift/lib/commit/73cc081b66cc58177415bf425f7899b289cc33af))

# [@shapeshiftoss/swapper-v5.1.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.4...@shapeshiftoss/swapper-v5.1.5) (2022-05-25)

# [@shapeshiftoss/swapper-v5.1.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.3...@shapeshiftoss/swapper-v5.1.4) (2022-05-24)

# [@shapeshiftoss/swapper-v5.1.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.2...@shapeshiftoss/swapper-v5.1.3) (2022-05-24)

# [@shapeshiftoss/swapper-v5.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.1...@shapeshiftoss/swapper-v5.1.2) (2022-05-23)

# [@shapeshiftoss/swapper-v5.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.1.0...@shapeshiftoss/swapper-v5.1.1) (2022-05-20)


### Bug Fixes

* add blacklist and make getBestSwapper return possibly undefined ([#672](https://github.com/shapeshift/lib/issues/672)) ([c2e3834](https://github.com/shapeshift/lib/commit/c2e38345a74af92c94890ccdcf1c6da2e30f99c1))

# [@shapeshiftoss/swapper-v5.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.0.1...@shapeshiftoss/swapper-v5.1.0) (2022-05-20)


### Features

* chain and asset utility functions ([#654](https://github.com/shapeshift/lib/issues/654)) ([4e12ce6](https://github.com/shapeshift/lib/commit/4e12ce6fd10cd8bf34e059e63c2a162fb6576932))

# [@shapeshiftoss/swapper-v5.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v5.0.0...@shapeshiftoss/swapper-v5.0.1) (2022-05-18)

# [@shapeshiftoss/swapper-v5.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.1.3...@shapeshiftoss/swapper-v5.0.0) (2022-05-18)


### Performance Improvements

* replace enums with dynamically derived object literals ([#656](https://github.com/shapeshift/lib/issues/656)) ([6d2d821](https://github.com/shapeshift/lib/commit/6d2d821318da9db4afec97b1247cf006a5fc42d2))


### BREAKING CHANGES

* the enum removal will need to be handled by consumers to use the new constants.

* chore: remove toString() and associated comment

* chore: remove string litirals

* chore: optimise imports

* chore: use string union for AssetNamespace

* chore: update README

# [@shapeshiftoss/swapper-v4.1.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.1.2...@shapeshiftoss/swapper-v4.1.3) (2022-05-17)

# [@shapeshiftoss/swapper-v4.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.1.1...@shapeshiftoss/swapper-v4.1.2) (2022-05-17)

# [@shapeshiftoss/swapper-v4.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.1.0...@shapeshiftoss/swapper-v4.1.1) (2022-05-13)


### Bug Fixes

* swapper mixup ([#645](https://github.com/shapeshift/lib/issues/645)) ([0ebb4a4](https://github.com/shapeshift/lib/commit/0ebb4a435c39eadec21054c1fce8a40769a98e60))

# [@shapeshiftoss/swapper-v4.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.0.4...@shapeshiftoss/swapper-v4.1.0) (2022-05-12)


### Features

* replace ChainTypes to SupportedChainIds in Swapper ([#630](https://github.com/shapeshift/lib/issues/630)) ([9c86118](https://github.com/shapeshift/lib/commit/9c86118b4766b11467c08fad0bed7017ecba40ac))

# [@shapeshiftoss/swapper-v4.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.0.3...@shapeshiftoss/swapper-v4.0.4) (2022-05-12)

# [@shapeshiftoss/swapper-v4.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.0.2...@shapeshiftoss/swapper-v4.0.3) (2022-05-12)

# [@shapeshiftoss/swapper-v4.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.0.1...@shapeshiftoss/swapper-v4.0.2) (2022-05-11)


### Bug Fixes

* dont crash when passing undefined to filterBuyAssetsBySellAssetId ([#634](https://github.com/shapeshift/lib/issues/634)) ([c014a7b](https://github.com/shapeshift/lib/commit/c014a7b0bc3616a34fa4aeac11e56e7470b98ac0))

# [@shapeshiftoss/swapper-v4.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v4.0.0...@shapeshiftoss/swapper-v4.0.1) (2022-05-10)

# [@shapeshiftoss/swapper-v4.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.7...@shapeshiftoss/swapper-v4.0.0) (2022-05-10)


### Performance Improvements

* **chainAdapters:** replace caip properties with their high-level counterparts ([#606](https://github.com/shapeshift/lib/issues/606)) ([49e8fef](https://github.com/shapeshift/lib/commit/49e8fefabb6eaaecb357ddc16e11ad2080eb3082))


### BREAKING CHANGES

* **chainAdapters:** updates chain adapters with caip-free types and vernacular.

* cleanup unchained commit cherry-pick

* Remove caip comment

* bump chain-adapters version and regen yarn lock

* chore: update yarn.lock

* chore: update yarn.lock

Co-authored-by: kaladinlight <35275952+kaladinlight@users.noreply.github.com>

# [@shapeshiftoss/swapper-v3.0.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.6...@shapeshiftoss/swapper-v3.0.7) (2022-05-05)

# [@shapeshiftoss/swapper-v3.0.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.5...@shapeshiftoss/swapper-v3.0.6) (2022-05-05)

# [@shapeshiftoss/swapper-v3.0.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.4...@shapeshiftoss/swapper-v3.0.5) (2022-05-03)

# [@shapeshiftoss/swapper-v3.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.3...@shapeshiftoss/swapper-v3.0.4) (2022-05-02)

# [@shapeshiftoss/swapper-v3.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.2...@shapeshiftoss/swapper-v3.0.3) (2022-05-02)

# [@shapeshiftoss/swapper-v3.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.1...@shapeshiftoss/swapper-v3.0.2) (2022-05-02)


### Bug Fixes

* removes 3 unnecessary api calls from zrxswapper.  ([#586](https://github.com/shapeshift/lib/issues/586)) ([57d59c8](https://github.com/shapeshift/lib/commit/57d59c8488cceb05cd5e0778b49690d0d2c97b68))

# [@shapeshiftoss/swapper-v3.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v3.0.0...@shapeshiftoss/swapper-v3.0.1) (2022-05-02)


### Bug Fixes

* unbreak lib build ([#588](https://github.com/shapeshift/lib/issues/588)) ([bff0f3d](https://github.com/shapeshift/lib/commit/bff0f3d351f09ae9693b6b173782e8d8671ca3e4))
* vscode tsconfig errors ([#577](https://github.com/shapeshift/lib/issues/577)) ([50138d0](https://github.com/shapeshift/lib/commit/50138d07b55b730f3bee68fae80414dc6578ee2a))

# [@shapeshiftoss/swapper-v3.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.3.0...@shapeshiftoss/swapper-v3.0.0) (2022-04-29)


### Features

* remove swappertype from quote fee type ([#569](https://github.com/shapeshift/lib/issues/569)) ([303dfb1](https://github.com/shapeshift/lib/commit/303dfb1fd1b27c00075c0921d1478e93cb9feeff))


### BREAKING CHANGES

* removed SwapperType generic

# [@shapeshiftoss/swapper-v2.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.2.2...@shapeshiftoss/swapper-v2.3.0) (2022-04-28)


### Features

* add assetid, chainid fields to asset type ([#570](https://github.com/shapeshift/lib/issues/570)) ([1c3c24c](https://github.com/shapeshift/lib/commit/1c3c24c2df6e71f3a4ad4b7f1863168aafdc8aa5))

# [@shapeshiftoss/swapper-v2.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.2.1...@shapeshiftoss/swapper-v2.2.2) (2022-04-28)


### Bug Fixes

* remove getmaxamount unnecessary code ([#582](https://github.com/shapeshift/lib/issues/582)) ([026672b](https://github.com/shapeshift/lib/commit/026672b39498ea5abe056cc21518d69e611e6090))

# [@shapeshiftoss/swapper-v2.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.2.0...@shapeshiftoss/swapper-v2.2.1) (2022-04-28)

# [@shapeshiftoss/swapper-v2.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.1.0...@shapeshiftoss/swapper-v2.2.0) (2022-04-27)


### Features

* **swapper:** add getByPair ([#526](https://github.com/shapeshift/lib/issues/526)) ([ec6d40f](https://github.com/shapeshift/lib/commit/ec6d40f9b399ab6eabdac97125e04c93342b7ab7))

# [@shapeshiftoss/swapper-v2.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.0.3...@shapeshiftoss/swapper-v2.1.0) (2022-04-25)


### Features

* swapper by buyasset ([#536](https://github.com/shapeshift/lib/issues/536)) ([fbcb02c](https://github.com/shapeshift/lib/commit/fbcb02c540c54a31fc6f637688c0bbdbcad1558c))

# [@shapeshiftoss/swapper-v2.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.0.2...@shapeshiftoss/swapper-v2.0.3) (2022-04-15)


### Bug Fixes

* add cosmos keepkey support ([#529](https://github.com/shapeshift/lib/issues/529)) ([74922b2](https://github.com/shapeshift/lib/commit/74922b282d493d31afada7929ab64f5d875ee032))

# [@shapeshiftoss/swapper-v2.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.0.1...@shapeshiftoss/swapper-v2.0.2) (2022-03-16)


### Bug Fixes

* update json rpc ([#442](https://github.com/shapeshift/lib/issues/442)) ([abfb16c](https://github.com/shapeshift/lib/commit/abfb16c3d28fa40bbb20e9834d95dca9d13e008a))

# [@shapeshiftoss/swapper-v2.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v2.0.0...@shapeshiftoss/swapper-v2.0.1) (2022-03-03)

# [@shapeshiftoss/swapper-v2.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.16.0...@shapeshiftoss/swapper-v2.0.0) (2022-03-03)


### Code Refactoring

* remove contract types and  make assetnamespace and assetreference required fields ([#410](https://github.com/shapeshift/lib/issues/410)) ([b12bbf3](https://github.com/shapeshift/lib/commit/b12bbf39f55e5d87775def96c2ca7ce05abff2ee))


### BREAKING CHANGES

* remove ContractTypes

For CAIP19 we will use AssetNamespace instead

* refactor(swapper): use AssetNamespace instead of ContractTypes

* feat(caip): caip19 requires assetNamespace and assetReference
* removed contractType and tokenId

assetNamespace and assetReference are used instead and are required

* refactor(asset-service): use AssetNamespace instead of ContractTypes

* refactor(chain-adapters): use assetNamespace and assetReference

For CAIP19, stop relying on default assets

* refactor(swapper): use assetReference instead of tokenId

* refactor(market-data): use assetReference instead of tokenId

* Update packages/caip/README.md

Co-authored-by: 0xdef1cafe <88504456+0xdef1cafe@users.noreply.github.com>

* refactor(asset-service): updated ERC20 strings to lowercase

Co-authored-by: Chris Thompson <chris@thompson-web.org>
Co-authored-by: 0xdef1cafe <88504456+0xdef1cafe@users.noreply.github.com>

# [@shapeshiftoss/swapper-v1.16.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.5...@shapeshiftoss/swapper-v1.16.0) (2022-02-28)


### Features

* add Cosmos based chain adapters ([#397](https://github.com/shapeshift/lib/issues/397)) ([a0690d7](https://github.com/shapeshift/lib/commit/a0690d700f924d5ff095cfeae072d204e4016708)), closes [#291](https://github.com/shapeshift/lib/issues/291)

# [@shapeshiftoss/swapper-v1.15.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.4...@shapeshiftoss/swapper-v1.15.5) (2022-02-18)

# [@shapeshiftoss/swapper-v1.15.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.3...@shapeshiftoss/swapper-v1.15.4) (2022-02-17)

# [@shapeshiftoss/swapper-v1.15.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.2...@shapeshiftoss/swapper-v1.15.3) (2022-02-16)


### Bug Fixes

* incorrect usd rate for multiple assets ([#372](https://github.com/shapeshift/lib/issues/372)) ([70221f1](https://github.com/shapeshift/lib/commit/70221f11c03a95143db64cd711ea5c00f7b5957d))

# [@shapeshiftoss/swapper-v1.15.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.1...@shapeshiftoss/swapper-v1.15.2) (2022-02-10)

# [@shapeshiftoss/swapper-v1.15.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.15.0...@shapeshiftoss/swapper-v1.15.1) (2022-01-07)


### Bug Fixes

* metamask toggle for erc20 trade ([#294](https://github.com/shapeshift/lib/issues/294)) ([7477423](https://github.com/shapeshift/lib/commit/7477423581423116822f5cc8e84faa14ed2bd14e))

# [@shapeshiftoss/swapper-v1.15.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.14.1...@shapeshiftoss/swapper-v1.15.0) (2021-12-16)


### Features

* use caip19s for default pair in swapper ([#287](https://github.com/shapeshift/lib/issues/287)) ([0e6d85b](https://github.com/shapeshift/lib/commit/0e6d85b3df60003767c7f62a3fef966d1b00126e))

# [@shapeshiftoss/swapper-v1.14.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.14.0...@shapeshiftoss/swapper-v1.14.1) (2021-12-15)

# [@shapeshiftoss/swapper-v1.14.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.13.0...@shapeshiftoss/swapper-v1.14.0) (2021-12-14)


### Features

* add CAIP2 and unit tests ([#284](https://github.com/shapeshift/lib/issues/284)) ([42c1e02](https://github.com/shapeshift/lib/commit/42c1e02e86380f976f7de77d9c99c135d53065ad))

# [@shapeshiftoss/swapper-v1.13.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.12.0...@shapeshiftoss/swapper-v1.13.0) (2021-12-10)


### Features

* add getcaip2 and caip identifiers to getaccount ([#279](https://github.com/shapeshift/lib/issues/279)) ([c1c819b](https://github.com/shapeshift/lib/commit/c1c819b682920b2887f7e11d1c3459f67354aadf))

# [@shapeshiftoss/swapper-v1.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.12...@shapeshiftoss/swapper-v1.12.0) (2021-11-30)


### Features

* use sibling packages as peerDependencies ([#229](https://github.com/shapeshift/lib/issues/229)) ([7de039e](https://github.com/shapeshift/lib/commit/7de039e89907d98048fe6b1e39b4a1e64377cb50))

# [@shapeshiftoss/swapper-v1.11.12](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.11...@shapeshiftoss/swapper-v1.11.12) (2021-11-29)


### Bug Fixes

* rename zrx swapper functions ([#252](https://github.com/shapeshift/lib/issues/252)) ([d56c134](https://github.com/shapeshift/lib/commit/d56c134d80863a15a95fa0c7197292a32421c53f))

# [@shapeshiftoss/swapper-v1.11.11](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.10...@shapeshiftoss/swapper-v1.11.11) (2021-11-24)

# [@shapeshiftoss/swapper-v1.11.10](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.9...@shapeshiftoss/swapper-v1.11.10) (2021-11-22)


### Bug Fixes

* adds explorerAddressLink fixing front end UI issues ([#251](https://github.com/shapeshift/lib/issues/251)) ([57af00f](https://github.com/shapeshift/lib/commit/57af00f691d2388a5eca7fa4ca0e91999854f155))

# [@shapeshiftoss/swapper-v1.11.9](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.8...@shapeshiftoss/swapper-v1.11.9) (2021-11-18)


### Bug Fixes

* fix send max for eth bug ([#243](https://github.com/shapeshift/lib/issues/243)) ([e18bf38](https://github.com/shapeshift/lib/commit/e18bf38f515e0754720b662654d3e6186dc97f71))

# [@shapeshiftoss/swapper-v1.11.8](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.7...@shapeshiftoss/swapper-v1.11.8) (2021-11-17)

# [@shapeshiftoss/swapper-v1.11.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.6...@shapeshiftoss/swapper-v1.11.7) (2021-11-17)


### Bug Fixes

* add MetaMask handling to swapper ([#234](https://github.com/shapeshift/lib/issues/234)) ([5565f0c](https://github.com/shapeshift/lib/commit/5565f0ca47d794008e2975b09db9a734a202e017))

# [@shapeshiftoss/swapper-v1.11.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.5...@shapeshiftoss/swapper-v1.11.6) (2021-11-17)

# [@shapeshiftoss/swapper-v1.11.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.4...@shapeshiftoss/swapper-v1.11.5) (2021-11-16)


### Bug Fixes

* update getSendMaxAmount to pass quote txData to getFeeData ([#227](https://github.com/shapeshift/lib/issues/227)) ([8256fa9](https://github.com/shapeshift/lib/commit/8256fa9daaee9f9c6cf6326cdd4ed1bcaef401a2))

# [@shapeshiftoss/swapper-v1.11.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.3...@shapeshiftoss/swapper-v1.11.4) (2021-11-15)

# [@shapeshiftoss/swapper-v1.11.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.2...@shapeshiftoss/swapper-v1.11.3) (2021-11-15)


### Bug Fixes

* update deps ([#228](https://github.com/shapeshift/lib/issues/228)) ([e75d49b](https://github.com/shapeshift/lib/commit/e75d49bac8cef6387bd7934c26f38010326a617e))

# [@shapeshiftoss/swapper-v1.11.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.1...@shapeshiftoss/swapper-v1.11.2) (2021-11-12)


### Bug Fixes

* bump types ([#224](https://github.com/shapeshift/lib/issues/224)) ([fc6ca1c](https://github.com/shapeshift/lib/commit/fc6ca1c5940701131f8421ddbe35f5f8e2d851d3))

# [@shapeshiftoss/swapper-v1.11.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.11.0...@shapeshiftoss/swapper-v1.11.1) (2021-11-12)


### Bug Fixes

* keep on bumpin ([#221](https://github.com/shapeshift/lib/issues/221)) ([d13834b](https://github.com/shapeshift/lib/commit/d13834b1b6d7d3f36975d5613f7d4590d52d3ee5))

# [@shapeshiftoss/swapper-v1.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.7...@shapeshiftoss/swapper-v1.11.0) (2021-11-10)


### Features

* add getSendMaxAmount to swapper ([#200](https://github.com/shapeshift/lib/issues/200)) ([1788f5f](https://github.com/shapeshift/lib/commit/1788f5f0aa94334f87452633d572eed4b4feee5d))

# [@shapeshiftoss/swapper-v1.10.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.6...@shapeshiftoss/swapper-v1.10.7) (2021-11-10)

# [@shapeshiftoss/swapper-v1.10.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.5...@shapeshiftoss/swapper-v1.10.6) (2021-11-10)

# [@shapeshiftoss/swapper-v1.10.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.4...@shapeshiftoss/swapper-v1.10.5) (2021-11-09)

# [@shapeshiftoss/swapper-v1.10.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.3...@shapeshiftoss/swapper-v1.10.4) (2021-11-09)


### Bug Fixes

* update to use latest chain adapter and types ([#201](https://github.com/shapeshift/lib/issues/201)) ([b7ee46d](https://github.com/shapeshift/lib/commit/b7ee46d59b7a35028d46ee3d0f79b355aa8f5724))

# [@shapeshiftoss/swapper-v1.10.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.2...@shapeshiftoss/swapper-v1.10.3) (2021-11-09)


### Bug Fixes

* fees ([#199](https://github.com/shapeshift/lib/issues/199)) ([d83993b](https://github.com/shapeshift/lib/commit/d83993b23c7d25546b4ce0b80064041090f6a6ab))

# [@shapeshiftoss/swapper-v1.10.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.1...@shapeshiftoss/swapper-v1.10.2) (2021-11-09)


### Bug Fixes

* bump package versions ([#198](https://github.com/shapeshift/lib/issues/198)) ([da6c8f1](https://github.com/shapeshift/lib/commit/da6c8f13eb361aa520f2f1e9fc3e16a3785ed287))

# [@shapeshiftoss/swapper-v1.10.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.10.0...@shapeshiftoss/swapper-v1.10.1) (2021-11-06)


### Bug Fixes

* update chain adapters and types to latest ([#195](https://github.com/shapeshift/lib/issues/195)) ([13cf236](https://github.com/shapeshift/lib/commit/13cf236846c9b827b53b109156a54c45f39a5e93))

# [@shapeshiftoss/swapper-v1.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.9.1...@shapeshiftoss/swapper-v1.10.0) (2021-11-05)


### Features

* chain specific buildtx ([#193](https://github.com/shapeshift/lib/issues/193)) ([b2411fa](https://github.com/shapeshift/lib/commit/b2411fabd928cce5ab38dcd82d7d800941ef6b46))

# [@shapeshiftoss/swapper-v1.9.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.9.0...@shapeshiftoss/swapper-v1.9.1) (2021-11-04)

# [@shapeshiftoss/swapper-v1.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.8.0...@shapeshiftoss/swapper-v1.9.0) (2021-11-03)


### Features

* asset service caip19s ([#184](https://github.com/shapeshift/lib/issues/184)) ([9b796ef](https://github.com/shapeshift/lib/commit/9b796ef386666674456706d190abf7562883a112))

# [@shapeshiftoss/swapper-v1.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.7.1...@shapeshiftoss/swapper-v1.8.0) (2021-10-31)


### Features

* adds support for metamask (hdwallet) ([#173](https://github.com/shapeshift/lib/issues/173)) ([bdb3f74](https://github.com/shapeshift/lib/commit/bdb3f744712ad4a865217f44bc83b44b8fa0871b))

# [@shapeshiftoss/swapper-v1.7.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.7.0...@shapeshiftoss/swapper-v1.7.1) (2021-10-29)


### Bug Fixes

* approval ([#175](https://github.com/shapeshift/lib/issues/175)) ([fae1c40](https://github.com/shapeshift/lib/commit/fae1c4082d49c504ea9d9f224b3c892450ca364e))

# [@shapeshiftoss/swapper-v1.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.6.3...@shapeshiftoss/swapper-v1.7.0) (2021-10-27)


### Features

* caip19 assets ([#171](https://github.com/shapeshift/lib/issues/171)) ([46c58a7](https://github.com/shapeshift/lib/commit/46c58a7251674991072860b2aeb060b06498c098))

# [@shapeshiftoss/swapper-v1.6.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.6.2...@shapeshiftoss/swapper-v1.6.3) (2021-10-27)

# [@shapeshiftoss/swapper-v1.6.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.6.1...@shapeshiftoss/swapper-v1.6.2) (2021-10-26)

# [@shapeshiftoss/swapper-v1.6.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.6.0...@shapeshiftoss/swapper-v1.6.1) (2021-10-25)

# [@shapeshiftoss/swapper-v1.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.5.1...@shapeshiftoss/swapper-v1.6.0) (2021-10-25)


### Features

* fix testing deps ([#101](https://github.com/shapeshift/lib/issues/101)) ([d75f48f](https://github.com/shapeshift/lib/commit/d75f48fec6947eb16eeb112d1b85f2e1840a52d3))

# [@shapeshiftoss/swapper-v1.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.5.0...@shapeshiftoss/swapper-v1.5.1) (2021-10-22)

# [@shapeshiftoss/swapper-v1.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.4.1...@shapeshiftoss/swapper-v1.5.0) (2021-10-22)


### Features

* add swapper cli ([#109](https://github.com/shapeshift/lib/issues/109)) ([191ad32](https://github.com/shapeshift/lib/commit/191ad325a42e676882ff2d25cae6fb773857f287))

# [@shapeshiftoss/swapper-v1.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.4.0...@shapeshiftoss/swapper-v1.4.1) (2021-10-20)


### Bug Fixes

* manually bump internal lib package versions to latest ([#142](https://github.com/shapeshift/lib/issues/142)) ([7711bcd](https://github.com/shapeshift/lib/commit/7711bcd2f00c4884754d9bb911cb3fd724eff182))

# [@shapeshiftoss/swapper-v1.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.3.1...@shapeshiftoss/swapper-v1.4.0) (2021-10-20)


### Features

* implement websockets for ethereum and improve type naming consistency ([#133](https://github.com/shapeshift/lib/issues/133)) ([d0c7f82](https://github.com/shapeshift/lib/commit/d0c7f82175e3655ea3cf85f040123b68daff47a0))

# [@shapeshiftoss/swapper-v1.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.3.0...@shapeshiftoss/swapper-v1.3.1) (2021-10-19)

# [@shapeshiftoss/swapper-v1.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.2.3...@shapeshiftoss/swapper-v1.3.0) (2021-10-19)


### Bug Fixes

* name for default zrx pair ([#134](https://github.com/shapeshift/lib/issues/134)) ([d11b228](https://github.com/shapeshift/lib/commit/d11b2282cb6232d6f93642250fa0a1b0bb66e08a))
* various tweaks to get web back in a working ergonomic state ([#135](https://github.com/shapeshift/lib/issues/135)) ([97e507d](https://github.com/shapeshift/lib/commit/97e507d9d52831309587c8e4ef5c8a7deba4c711))


### Features

* btc chain adapters and unchained ([#124](https://github.com/shapeshift/lib/issues/124)) ([c931a72](https://github.com/shapeshift/lib/commit/c931a727405d19ebcb757c26ef8d13e086c29b20)), closes [#126](https://github.com/shapeshift/lib/issues/126)

# [@shapeshiftoss/swapper-v1.2.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.2.2...@shapeshiftoss/swapper-v1.2.3) (2021-10-12)


### Bug Fixes

* update chain adapters in swapper ([#118](https://github.com/shapeshift/lib/issues/118)) ([709c018](https://github.com/shapeshift/lib/commit/709c018a0a5dffab9c01b8f6cd569ed6489ce136))

# [@shapeshiftoss/swapper-v1.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.2.1...@shapeshiftoss/swapper-v1.2.2) (2021-10-12)


### Bug Fixes

* update types ([#115](https://github.com/shapeshift/lib/issues/115)) ([ea989ff](https://github.com/shapeshift/lib/commit/ea989ff67b86ae420b3cd4251401cd5882c791d1))

# [@shapeshiftoss/swapper-v1.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.2.0...@shapeshiftoss/swapper-v1.2.1) (2021-10-12)


### Bug Fixes

* upgrade to latest version of web3 in swapper ([#112](https://github.com/shapeshift/lib/issues/112)) ([150b4fe](https://github.com/shapeshift/lib/commit/150b4fe79e3ae006cdabbb93c0aeaed8980ac2ac))

# [@shapeshiftoss/swapper-v1.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.1.0...@shapeshiftoss/swapper-v1.2.0) (2021-10-11)


### Features

* be more descriptive with getDefaultPair ([#111](https://github.com/shapeshift/lib/issues/111)) ([13448c2](https://github.com/shapeshift/lib/commit/13448c234c21269c0592ea8dded827dd36f20a60))

# [@shapeshiftoss/swapper-v1.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/swapper-v1.0.0...@shapeshiftoss/swapper-v1.1.0) (2021-10-11)


### Features

* add buy amount ([#108](https://github.com/shapeshift/lib/issues/108)) ([c7037df](https://github.com/shapeshift/lib/commit/c7037dfb64c599106ba7d10e8073bb60a556cf4f))

# @shapeshiftoss/swapper-v1.0.0 (2021-10-07)


### Features

* add approval needed to lib ([#95](https://github.com/shapeshift/lib/issues/95)) ([0b1bae4](https://github.com/shapeshift/lib/commit/0b1bae4ad71de3a1306df1e5c8dd8964e26ce1cc))
* add execute quote ([#87](https://github.com/shapeshift/lib/issues/87)) ([463a06d](https://github.com/shapeshift/lib/commit/463a06d003b991433a4246a7a55db806284ba03f))
* add getdefaultpair to zrxswapper ([#91](https://github.com/shapeshift/lib/issues/91)) ([d1cf1be](https://github.com/shapeshift/lib/commit/d1cf1be7c611517068c789d3cfa854aa19573a2b))
* get min max ([#93](https://github.com/shapeshift/lib/issues/93)) ([26b788d](https://github.com/shapeshift/lib/commit/26b788d48bd7b7aa27c5d2386ac6fb0e6bff1fd9))
* **zrxSwapper:** add usd rate ([#85](https://github.com/shapeshift/lib/issues/85)) ([1d5d36e](https://github.com/shapeshift/lib/commit/1d5d36e6a912e0c6f1264ae6eb6f85cc1b80e4ec))
* bring over buildQuoteTx logic from platform-shared ([#71](https://github.com/shapeshift/lib/issues/71)) ([4ec3365](https://github.com/shapeshift/lib/commit/4ec33654b15298490f656f5e3562d37c23ecb69d))
