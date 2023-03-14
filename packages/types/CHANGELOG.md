# [@shapeshiftoss/types-v8.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.5.0...@shapeshiftoss/types-v8.6.0) (2023-03-14)


### Features

* add bnb smart chain ([#1197](https://github.com/shapeshift/lib/issues/1197)) ([245e7a4](https://github.com/shapeshift/lib/commit/245e7a476e41580d4ac72666605a4867d7a71f03))

# [@shapeshiftoss/types-v8.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.4.0...@shapeshiftoss/types-v8.5.0) (2023-01-13)


### Features

* add optimism ([#1157](https://github.com/shapeshift/lib/issues/1157)) ([177725d](https://github.com/shapeshift/lib/commit/177725dc04c00ba982bbebe8e84a7edcff395367))

# [@shapeshiftoss/types-v8.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.3.3...@shapeshiftoss/types-v8.4.0) (2023-01-12)


### Features

* **types:** export all utility types ([#1163](https://github.com/shapeshift/lib/issues/1163)) ([166d3c5](https://github.com/shapeshift/lib/commit/166d3c59f4919035a4f241a939ff7441ecce77ad))

# [@shapeshiftoss/types-v8.3.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.3.2...@shapeshiftoss/types-v8.3.3) (2022-12-22)


### Bug Fixes

* **chain-adapters:** switch chain on contract calls ([#1132](https://github.com/shapeshift/lib/issues/1132)) ([81d8857](https://github.com/shapeshift/lib/commit/81d8857dd6b148c4559e391526d4a28cc0cfc49f))

# [@shapeshiftoss/types-v8.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.3.1...@shapeshiftoss/types-v8.3.2) (2022-10-19)

# [@shapeshiftoss/types-v8.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.3.0...@shapeshiftoss/types-v8.3.1) (2022-09-16)

# [@shapeshiftoss/types-v8.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.2.1...@shapeshiftoss/types-v8.3.0) (2022-09-12)


### Features

* add THORChain support ([#1010](https://github.com/shapeshift/lib/issues/1010)) ([d7c3b72](https://github.com/shapeshift/lib/commit/d7c3b72bbda9795f87fa8f73c35926c95026a3c2))

# [@shapeshiftoss/types-v8.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.2.0...@shapeshiftoss/types-v8.2.1) (2022-08-15)

# [@shapeshiftoss/types-v8.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.1.0...@shapeshiftoss/types-v8.2.0) (2022-08-02)


### Features

* add bitcoincash ([#932](https://github.com/shapeshift/lib/issues/932)) ([85080ed](https://github.com/shapeshift/lib/commit/85080ed065027d3e9fe6d28799a0c171ac7ea39c))

# [@shapeshiftoss/types-v8.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v8.0.0...@shapeshiftoss/types-v8.1.0) (2022-07-29)


### Features

* litecoin ([#914](https://github.com/shapeshift/lib/issues/914)) ([5af5c60](https://github.com/shapeshift/lib/commit/5af5c60c954ae0295d4cd175b98da3732d99d9e4))

# [@shapeshiftoss/types-v8.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v7.1.0...@shapeshiftoss/types-v8.0.0) (2022-07-26)


### Features

* **types:** export Asset type from asset-service ([#893](https://github.com/shapeshift/lib/issues/893)) ([616ea72](https://github.com/shapeshift/lib/commit/616ea72573dd7a3a91a9233d83f8936b43ca0ed7))


### BREAKING CHANGES

* **types:** Asset is now exported from asset-service, and all consumers should now import it from it

* fix: tests Asset type imports

# [@shapeshiftoss/types-v7.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v7.0.0...@shapeshiftoss/types-v7.1.0) (2022-07-20)


### Features

* dogecoin ([#888](https://github.com/shapeshift/lib/issues/888)) ([7ccb927](https://github.com/shapeshift/lib/commit/7ccb92707b48d912f1fd2126888b314baacbbfda))

# [@shapeshiftoss/types-v7.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v6.3.0...@shapeshiftoss/types-v7.0.0) (2022-07-07)


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

# [@shapeshiftoss/types-v6.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v6.2.0...@shapeshiftoss/types-v6.3.0) (2022-06-30)


### Features

* abstract evm base chain adapter and add avalanche chain adapter ([#845](https://github.com/shapeshift/lib/issues/845)) ([b85b892](https://github.com/shapeshift/lib/commit/b85b892beaa9538c7990a5ee1990950a9b027c59))

# [@shapeshiftoss/types-v6.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v6.1.0...@shapeshiftoss/types-v6.2.0) (2022-06-27)


### Features

* avalanche market data ([#833](https://github.com/shapeshift/lib/issues/833)) ([086dc57](https://github.com/shapeshift/lib/commit/086dc57206fa6c07dbce473dc2dac4e1f8461ac5))

# [@shapeshiftoss/types-v6.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v6.0.0...@shapeshiftoss/types-v6.1.0) (2022-06-13)


### Features

* **types:** add CoingeckoAssetPlatform enum ([#800](https://github.com/shapeshift/lib/issues/800)) ([cab8035](https://github.com/shapeshift/lib/commit/cab80353d0c7c15b0c44a7907a400fa3b8a82a14))

# [@shapeshiftoss/types-v6.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v5.0.0...@shapeshiftoss/types-v6.0.0) (2022-06-13)


### Features

* **types:** remove ChainTypes, NetworkTypes, and AssetDataSource ([#792](https://github.com/shapeshift/lib/issues/792)) ([54347d7](https://github.com/shapeshift/lib/commit/54347d73d7a8682d333de753832fa9574ba2f4ad))


### BREAKING CHANGES

* **types:** removes ChainTypes, NetworkTypes, and AssetDataSource

* chore: manually bump package version

# [@shapeshiftoss/types-v5.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.4.1...@shapeshiftoss/types-v5.0.0) (2022-06-09)


### Features

* **types:** remove chainAdapters types ([#773](https://github.com/shapeshift/lib/issues/773)) ([40a32cb](https://github.com/shapeshift/lib/commit/40a32cb8077e1b6336f0f8fec00e871b989146c8))


### BREAKING CHANGES

* **types:** Removed `chainAdapters` types. Those will now be in the `chain-adapters` package.

# [@shapeshiftoss/types-v4.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.4.0...@shapeshiftoss/types-v4.4.1) (2022-06-08)

# [@shapeshiftoss/types-v4.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.3.2...@shapeshiftoss/types-v4.4.0) (2022-06-03)


### Features

* **types:** remove Asset properties for normalization ([#743](https://github.com/shapeshift/lib/issues/743)) ([76088d5](https://github.com/shapeshift/lib/commit/76088d5f2cdce1fb7eb1b454be181648cc208351))

# [@shapeshiftoss/types-v4.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.3.1...@shapeshiftoss/types-v4.3.2) (2022-05-26)

# [@shapeshiftoss/types-v4.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.3.0...@shapeshiftoss/types-v4.3.1) (2022-05-24)

# [@shapeshiftoss/types-v4.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.2.0...@shapeshiftoss/types-v4.3.0) (2022-05-20)


### Features

* add supply and maxSupply to marketData ([#673](https://github.com/shapeshift/lib/issues/673)) ([773b632](https://github.com/shapeshift/lib/commit/773b6325acf5ff1122aa2dde9f2dc34f41eab4ad))

# [@shapeshiftoss/types-v4.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.1.0...@shapeshiftoss/types-v4.2.0) (2022-05-18)


### Features

* osmosis adapter ([#664](https://github.com/shapeshift/lib/issues/664)) ([8bcdfd1](https://github.com/shapeshift/lib/commit/8bcdfd17a9902fb08239c4b4a2db3ae6b6e15183))

# [@shapeshiftoss/types-v4.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.0.1...@shapeshiftoss/types-v4.1.0) (2022-05-12)


### Features

* replace ChainTypes to SupportedChainIds in Swapper ([#630](https://github.com/shapeshift/lib/issues/630)) ([9c86118](https://github.com/shapeshift/lib/commit/9c86118b4766b11467c08fad0bed7017ecba40ac))

# [@shapeshiftoss/types-v4.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v4.0.0...@shapeshiftoss/types-v4.0.1) (2022-05-12)

# [@shapeshiftoss/types-v4.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.5...@shapeshiftoss/types-v4.0.0) (2022-05-05)


### Performance Improvements

* **types:** trigger major version bump ([#617](https://github.com/shapeshift/lib/issues/617)) ([212b1e7](https://github.com/shapeshift/lib/commit/212b1e75442e34ccba24ac1fca969d12ba87f990))


### BREAKING CHANGES

* **types:** trigger the major version bump that should have occurred with the changes in 3.1.4

# [@shapeshiftoss/types-v3.1.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.4...@shapeshiftoss/types-v3.1.5) (2022-05-05)


### chore

* **types:** trigger major version bump ([#616](https://github.com/shapeshift/lib/issues/616)) ([18f21ce](https://github.com/shapeshift/lib/commit/18f21ce9aba34597c0e4af361cddf62411536555))


### BREAKING CHANGES

* **types:** trigger the major version bump that should have occurred with the changes in 3.1.4

Also fix the README header...

# [@shapeshiftoss/types-v3.1.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.3...@shapeshiftoss/types-v3.1.4) (2022-05-05)

# [@shapeshiftoss/types-v3.1.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.2...@shapeshiftoss/types-v3.1.3) (2022-05-05)

# [@shapeshiftoss/types-v3.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.1...@shapeshiftoss/types-v3.1.2) (2022-05-03)

# [@shapeshiftoss/types-v3.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.1.0...@shapeshiftoss/types-v3.1.1) (2022-05-02)

# [@shapeshiftoss/types-v3.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.0.1...@shapeshiftoss/types-v3.1.0) (2022-05-02)


### Features

* make caip2, caip19 fields optional ([#593](https://github.com/shapeshift/lib/issues/593)) ([0ac7a81](https://github.com/shapeshift/lib/commit/0ac7a815ed189ee5b842d7488752e14f8a84f8f4))

# [@shapeshiftoss/types-v3.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v3.0.0...@shapeshiftoss/types-v3.0.1) (2022-05-02)


### Bug Fixes

* vscode tsconfig errors ([#577](https://github.com/shapeshift/lib/issues/577)) ([50138d0](https://github.com/shapeshift/lib/commit/50138d07b55b730f3bee68fae80414dc6578ee2a))

# [@shapeshiftoss/types-v3.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.11.0...@shapeshiftoss/types-v3.0.0) (2022-04-29)


### Features

* remove swappertype from quote fee type ([#569](https://github.com/shapeshift/lib/issues/569)) ([303dfb1](https://github.com/shapeshift/lib/commit/303dfb1fd1b27c00075c0921d1478e93cb9feeff))


### BREAKING CHANGES

* removed SwapperType generic

# [@shapeshiftoss/types-v2.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.10.1...@shapeshiftoss/types-v2.11.0) (2022-04-28)


### Features

* add assetid, chainid fields to asset type ([#570](https://github.com/shapeshift/lib/issues/570)) ([1c3c24c](https://github.com/shapeshift/lib/commit/1c3c24c2df6e71f3a4ad4b7f1863168aafdc8aa5))

# [@shapeshiftoss/types-v2.10.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.10.0...@shapeshiftoss/types-v2.10.1) (2022-04-28)


### Bug Fixes

* remove getmaxamount unnecessary code ([#582](https://github.com/shapeshift/lib/issues/582)) ([026672b](https://github.com/shapeshift/lib/commit/026672b39498ea5abe056cc21518d69e611e6090))

# [@shapeshiftoss/types-v2.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.9.1...@shapeshiftoss/types-v2.10.0) (2022-04-27)


### Features

* **swapper:** add getByPair ([#526](https://github.com/shapeshift/lib/issues/526)) ([ec6d40f](https://github.com/shapeshift/lib/commit/ec6d40f9b399ab6eabdac97125e04c93342b7ab7))

# [@shapeshiftoss/types-v2.9.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.9.0...@shapeshiftoss/types-v2.9.1) (2022-04-15)


### Bug Fixes

* add cosmos keepkey support ([#529](https://github.com/shapeshift/lib/issues/529)) ([74922b2](https://github.com/shapeshift/lib/commit/74922b282d493d31afada7929ab64f5d875ee032))

# [@shapeshiftoss/types-v2.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.8.0...@shapeshiftoss/types-v2.9.0) (2022-04-10)


### Features

* add Cosmos delegated tokens to Validator ([#514](https://github.com/shapeshift/lib/issues/514)) ([113ad35](https://github.com/shapeshift/lib/commit/113ad356f0a2fdf49bbe7638f5b08531baed8cd3))

# [@shapeshiftoss/types-v2.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.7.0...@shapeshiftoss/types-v2.8.0) (2022-04-04)


### Features

* support eip-1159 in buildSendTransaction ([#440](https://github.com/shapeshift/lib/issues/440)) ([c50e503](https://github.com/shapeshift/lib/commit/c50e503f5dc4ef7074ef0a431f5451d78ecb0fd9))

# [@shapeshiftoss/types-v2.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.6.0...@shapeshiftoss/types-v2.7.0) (2022-03-29)


### Features

* move withdraw type to types package ([#498](https://github.com/shapeshift/lib/issues/498)) ([6a7e7d1](https://github.com/shapeshift/lib/commit/6a7e7d17a025691e37769f5807fa144c8d872b1e))

# [@shapeshiftoss/types-v2.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.5.0...@shapeshiftoss/types-v2.6.0) (2022-03-28)


### Features

* delegate, undelegate and withdraw transactions ([#499](https://github.com/shapeshift/lib/issues/499)) ([239c216](https://github.com/shapeshift/lib/commit/239c2169f1d09e155abc941dd03bc76f6ce26861))

# [@shapeshiftoss/types-v2.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.4.0...@shapeshiftoss/types-v2.5.0) (2022-03-28)


### Features

* add validator info ([#491](https://github.com/shapeshift/lib/issues/491)) ([92ef7de](https://github.com/shapeshift/lib/commit/92ef7de7fbae8ab77796932918f54c68aa01f3b8))

# [@shapeshiftoss/types-v2.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.3.0...@shapeshiftoss/types-v2.4.0) (2022-03-24)


### Features

* return staking details for cosmos type accounts ([#479](https://github.com/shapeshift/lib/issues/479)) ([0d0712a](https://github.com/shapeshift/lib/commit/0d0712a13fa338b9fe700c2a496f34da29509328))

# [@shapeshiftoss/types-v2.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.2.1...@shapeshiftoss/types-v2.3.0) (2022-03-22)


### Features

* accept memo in buildSendTransaction ([#467](https://github.com/shapeshift/lib/issues/467)) ([bbbaf46](https://github.com/shapeshift/lib/commit/bbbaf46ce2003cdab86fa60747d15b708037c616))

# [@shapeshiftoss/types-v2.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.2.0...@shapeshiftoss/types-v2.2.1) (2022-03-22)


### Bug Fixes

* make accountType optional in BitcoinChainAdapter getaddress ([#452](https://github.com/shapeshift/lib/issues/452)) ([42372a4](https://github.com/shapeshift/lib/commit/42372a49ca417f248fb415a5c0c07f2ea8db2c56))

# [@shapeshiftoss/types-v2.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.1.0...@shapeshiftoss/types-v2.2.0) (2022-03-21)


### Features

* cosmos sign and broadcast tx ([#435](https://github.com/shapeshift/lib/issues/435)) ([1ba16a1](https://github.com/shapeshift/lib/commit/1ba16a1589113b3a1eb17415ec6f7e85c6d857a7))

# [@shapeshiftoss/types-v2.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v2.0.0...@shapeshiftoss/types-v2.1.0) (2022-03-10)


### Features

* cosmos tx history support ([#416](https://github.com/shapeshift/lib/issues/416)) ([94f24eb](https://github.com/shapeshift/lib/commit/94f24ebfe83f36bf0802d99bdcf7626905b82432))

# [@shapeshiftoss/types-v2.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.26.0...@shapeshiftoss/types-v2.0.0) (2022-03-03)


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

# [@shapeshiftoss/types-v1.26.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.25.0...@shapeshiftoss/types-v1.26.0) (2022-02-28)


### Features

* add Cosmos based chain adapters ([#397](https://github.com/shapeshift/lib/issues/397)) ([a0690d7](https://github.com/shapeshift/lib/commit/a0690d700f924d5ff095cfeae072d204e4016708)), closes [#291](https://github.com/shapeshift/lib/issues/291)

# [@shapeshiftoss/types-v1.25.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.24.0...@shapeshiftoss/types-v1.25.0) (2022-02-28)


### Features

* add "Contract" TxType ([#405](https://github.com/shapeshift/lib/issues/405)) ([df0d303](https://github.com/shapeshift/lib/commit/df0d3038a516fb8164181f26a838b6fcecfd0c60))

# [@shapeshiftoss/types-v1.24.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.23.1...@shapeshiftoss/types-v1.24.0) (2022-02-25)


### Features

* add metadata to transaction WebSocket messages ([#396](https://github.com/shapeshift/lib/issues/396)) ([7f6ccf3](https://github.com/shapeshift/lib/commit/7f6ccf35c9f31044e74cb77c869e0126618f4fb9))

# [@shapeshiftoss/types-v1.23.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.23.0...@shapeshiftoss/types-v1.23.1) (2022-02-25)


### Bug Fixes

* caip support for Osmosis ([#398](https://github.com/shapeshift/lib/issues/398)) ([e0edc67](https://github.com/shapeshift/lib/commit/e0edc673732df2810dae32c5a49014cd174bad5a))

# [@shapeshiftoss/types-v1.23.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.22.0...@shapeshiftoss/types-v1.23.0) (2022-02-16)


### Features

* add isTrusted to description of asset service ([#357](https://github.com/shapeshift/lib/issues/357)) ([49b002f](https://github.com/shapeshift/lib/commit/49b002f240ab29f3e6e85cfa7ef324bd16c7c3e3))

# [@shapeshiftoss/types-v1.22.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.21.1...@shapeshiftoss/types-v1.22.0) (2022-02-16)


### Features

* caip2/caip19 for Cosmos SDK ([#371](https://github.com/shapeshift/lib/issues/371)) ([24d8f03](https://github.com/shapeshift/lib/commit/24d8f034348e4e6f11da7bdba035312924a0fe9d))

# [@shapeshiftoss/types-v1.21.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.21.0...@shapeshiftoss/types-v1.21.1) (2022-02-07)


### Bug Fixes

* yearn chart data ([#341](https://github.com/shapeshift/lib/issues/341)) ([9a4dead](https://github.com/shapeshift/lib/commit/9a4dead4a8fe64972941b6a97978f805de0c61d6))

# [@shapeshiftoss/types-v1.21.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.20.0...@shapeshiftoss/types-v1.21.0) (2022-01-12)


### Features

* add EIP-1559 parameters to getFeeData return object ([#288](https://github.com/shapeshift/lib/issues/288)) ([1329396](https://github.com/shapeshift/lib/commit/1329396954dc4cc5dd84578dd396a1383d9f027d))

# [@shapeshiftoss/types-v1.20.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.19.1...@shapeshiftoss/types-v1.20.0) (2021-12-17)


### Features

* implement yearn market service ([#273](https://github.com/shapeshift/lib/issues/273)) ([d999850](https://github.com/shapeshift/lib/commit/d999850a5ab73de64b77626c4c36edd3da9f3117))

# [@shapeshiftoss/types-v1.19.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.19.0...@shapeshiftoss/types-v1.19.1) (2021-12-15)

# [@shapeshiftoss/types-v1.19.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.18.0...@shapeshiftoss/types-v1.19.0) (2021-12-14)


### Features

* add CAIP2 and unit tests ([#284](https://github.com/shapeshift/lib/issues/284)) ([42c1e02](https://github.com/shapeshift/lib/commit/42c1e02e86380f976f7de77d9c99c135d53065ad))

# [@shapeshiftoss/types-v1.18.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.17.0...@shapeshiftoss/types-v1.18.0) (2021-12-10)


### Features

* add getcaip2 and caip identifiers to getaccount ([#279](https://github.com/shapeshift/lib/issues/279)) ([c1c819b](https://github.com/shapeshift/lib/commit/c1c819b682920b2887f7e11d1c3459f67354aadf))

# [@shapeshiftoss/types-v1.17.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.16.2...@shapeshiftoss/types-v1.17.0) (2021-12-08)


### Features

* update subscribeTxs to use new tx parser payloads ([#266](https://github.com/shapeshift/lib/issues/266)) ([f77a277](https://github.com/shapeshift/lib/commit/f77a277e1942a4ee4229ce095c17e9c51907e2b9))

# [@shapeshiftoss/types-v1.16.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.16.1...@shapeshiftoss/types-v1.16.2) (2021-12-08)

# [@shapeshiftoss/types-v1.16.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.16.0...@shapeshiftoss/types-v1.16.1) (2021-12-02)

# [@shapeshiftoss/types-v1.16.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.15.0...@shapeshiftoss/types-v1.16.0) (2021-12-02)


### Features

* add optional description to base asset type ([#264](https://github.com/shapeshift/lib/issues/264)) ([9fc4c63](https://github.com/shapeshift/lib/commit/9fc4c637286c3f285cdeb21970f370ca63b19301))

# [@shapeshiftoss/types-v1.15.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.14.0...@shapeshiftoss/types-v1.15.0) (2021-12-02)


### Features

* send max ([#262](https://github.com/shapeshift/lib/issues/262)) ([dab48ec](https://github.com/shapeshift/lib/commit/dab48ecabc808ecf0de8989bf390003bd6483517))

# [@shapeshiftoss/types-v1.14.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.13.1...@shapeshiftoss/types-v1.14.0) (2021-11-30)


### Features

* use sibling packages as peerDependencies ([#229](https://github.com/shapeshift/lib/issues/229)) ([7de039e](https://github.com/shapeshift/lib/commit/7de039e89907d98048fe6b1e39b4a1e64377cb50))

# [@shapeshiftoss/types-v1.13.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.13.0...@shapeshiftoss/types-v1.13.1) (2021-11-22)


### Bug Fixes

* adds explorerAddressLink fixing front end UI issues ([#251](https://github.com/shapeshift/lib/issues/251)) ([57af00f](https://github.com/shapeshift/lib/commit/57af00f691d2388a5eca7fa4ca0e91999854f155))

# [@shapeshiftoss/types-v1.13.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.12.0...@shapeshiftoss/types-v1.13.0) (2021-11-17)


### Features

* portis wallet not showing BTC balance ([#225](https://github.com/shapeshift/lib/issues/225)) ([624e13a](https://github.com/shapeshift/lib/commit/624e13a1fc3a4e770ef212100919baa922b365bc))

# [@shapeshiftoss/types-v1.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.11.4...@shapeshiftoss/types-v1.12.0) (2021-11-16)


### Features

* send trade details over websocket from eth chain adapter ([#233](https://github.com/shapeshift/lib/issues/233)) ([8a4ed0a](https://github.com/shapeshift/lib/commit/8a4ed0aa3e746dee2c0e4bda7497ee515f4d55b7))

# [@shapeshiftoss/types-v1.11.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.11.3...@shapeshiftoss/types-v1.11.4) (2021-11-12)


### Bug Fixes

* gas fees erc20 ([#223](https://github.com/shapeshift/lib/issues/223)) ([fc0159d](https://github.com/shapeshift/lib/commit/fc0159d9600efdba34d60e6edda0b3ccd6031359))

# [@shapeshiftoss/types-v1.11.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.11.2...@shapeshiftoss/types-v1.11.3) (2021-11-10)


### Bug Fixes

* add comment to MaxAmountInput ([#211](https://github.com/shapeshift/lib/issues/211)) ([5b95e2e](https://github.com/shapeshift/lib/commit/5b95e2ebb36d0dc92f58607132d1200e01176d82))

# [@shapeshiftoss/types-v1.11.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.11.1...@shapeshiftoss/types-v1.11.2) (2021-11-09)

# [@shapeshiftoss/types-v1.11.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.11.0...@shapeshiftoss/types-v1.11.1) (2021-11-09)


### Bug Fixes

* fees ([#199](https://github.com/shapeshift/lib/issues/199)) ([d83993b](https://github.com/shapeshift/lib/commit/d83993b23c7d25546b4ce0b80064041090f6a6ab))

# [@shapeshiftoss/types-v1.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.10.0...@shapeshiftoss/types-v1.11.0) (2021-11-08)


### Features

* add bitcoin websocket support ([#191](https://github.com/shapeshift/lib/issues/191)) ([3d1226a](https://github.com/shapeshift/lib/commit/3d1226a8a23bc724afb88d8a0ddea439b5514bc6))

# [@shapeshiftoss/types-v1.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.9.1...@shapeshiftoss/types-v1.10.0) (2021-11-05)


### Features

* chain specific buildtx ([#193](https://github.com/shapeshift/lib/issues/193)) ([b2411fa](https://github.com/shapeshift/lib/commit/b2411fabd928cce5ab38dcd82d7d800941ef6b46))

# [@shapeshiftoss/types-v1.9.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.9.0...@shapeshiftoss/types-v1.9.1) (2021-11-04)


### Bug Fixes

* fees part 1 cleanup ([#190](https://github.com/shapeshift/lib/issues/190)) ([c6fb104](https://github.com/shapeshift/lib/commit/c6fb104d282b88c80424ff7e90e25c2998b50feb))

# [@shapeshiftoss/types-v1.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.8.0...@shapeshiftoss/types-v1.9.0) (2021-11-02)


### Features

* enable getAddress to show on device ([#183](https://github.com/shapeshift/lib/issues/183)) ([62ba8b6](https://github.com/shapeshift/lib/commit/62ba8b682b1809e3fc8a2d1934a7ec212b4ba379))

# [@shapeshiftoss/types-v1.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.7.0...@shapeshiftoss/types-v1.8.0) (2021-11-02)


### Features

* market service market cap functionality ([#153](https://github.com/shapeshift/lib/issues/153)) ([cce22b9](https://github.com/shapeshift/lib/commit/cce22b9398e26ee90c50633941f293e13512a65c))

# [@shapeshiftoss/types-v1.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.6.0...@shapeshiftoss/types-v1.7.0) (2021-11-01)


### Features

* move util functions from web ([#177](https://github.com/shapeshift/lib/issues/177)) ([58002d9](https://github.com/shapeshift/lib/commit/58002d9ca4f8948d5c2f8f28b00cbc35c58971e6))

# [@shapeshiftoss/types-v1.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.5.0...@shapeshiftoss/types-v1.6.0) (2021-10-31)


### Features

* adds support for metamask (hdwallet) ([#173](https://github.com/shapeshift/lib/issues/173)) ([bdb3f74](https://github.com/shapeshift/lib/commit/bdb3f744712ad4a865217f44bc83b44b8fa0871b))

# [@shapeshiftoss/types-v1.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.4.1...@shapeshiftoss/types-v1.5.0) (2021-10-27)


### Features

* caip19 assets ([#171](https://github.com/shapeshift/lib/issues/171)) ([46c58a7](https://github.com/shapeshift/lib/commit/46c58a7251674991072860b2aeb060b06498c098))

# [@shapeshiftoss/types-v1.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.4.0...@shapeshiftoss/types-v1.4.1) (2021-10-27)

# [@shapeshiftoss/types-v1.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.3.0...@shapeshiftoss/types-v1.4.0) (2021-10-25)


### Features

* tx history data ([#149](https://github.com/shapeshift/lib/issues/149)) ([3405a0a](https://github.com/shapeshift/lib/commit/3405a0aa600363afc1778bd6f07af123591c4e11))

# [@shapeshiftoss/types-v1.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.2.1...@shapeshiftoss/types-v1.3.0) (2021-10-25)


### Features

* fix testing deps ([#101](https://github.com/shapeshift/lib/issues/101)) ([d75f48f](https://github.com/shapeshift/lib/commit/d75f48fec6947eb16eeb112d1b85f2e1840a52d3))

# [@shapeshiftoss/types-v1.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.2.0...@shapeshiftoss/types-v1.2.1) (2021-10-22)

# [@shapeshiftoss/types-v1.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.1.1...@shapeshiftoss/types-v1.2.0) (2021-10-20)


### Features

* implement websockets for ethereum and improve type naming consistency ([#133](https://github.com/shapeshift/lib/issues/133)) ([d0c7f82](https://github.com/shapeshift/lib/commit/d0c7f82175e3655ea3cf85f040123b68daff47a0))

# [@shapeshiftoss/types-v1.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.1.0...@shapeshiftoss/types-v1.1.1) (2021-10-19)

# [@shapeshiftoss/types-v1.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.0.2...@shapeshiftoss/types-v1.1.0) (2021-10-19)


### Bug Fixes

* generic types and type package organization ([#129](https://github.com/shapeshift/lib/issues/129)) ([3bee811](https://github.com/shapeshift/lib/commit/3bee8111d720857595efdeb8a4de06bd9850ca7a))
* various tweaks to get web back in a working ergonomic state ([#135](https://github.com/shapeshift/lib/issues/135)) ([97e507d](https://github.com/shapeshift/lib/commit/97e507d9d52831309587c8e4ef5c8a7deba4c711))


### Features

* btc chain adapters and unchained ([#124](https://github.com/shapeshift/lib/issues/124)) ([c931a72](https://github.com/shapeshift/lib/commit/c931a727405d19ebcb757c26ef8d13e086c29b20)), closes [#126](https://github.com/shapeshift/lib/issues/126)

# [@shapeshiftoss/types-v1.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.0.1...@shapeshiftoss/types-v1.0.2) (2021-10-12)


### Bug Fixes

* remove unused type causing circular reference until we implement ([#113](https://github.com/shapeshift/lib/issues/113)) ([d096690](https://github.com/shapeshift/lib/commit/d0966904a008190470e2f12f215a4da15649890a))

# [@shapeshiftoss/types-v1.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/types-v1.0.0...@shapeshiftoss/types-v1.0.1) (2021-10-07)

# @shapeshiftoss/types-v1.0.0 (2021-10-06)


### Features

* add approval needed to lib ([#95](https://github.com/shapeshift/lib/issues/95)) ([0b1bae4](https://github.com/shapeshift/lib/commit/0b1bae4ad71de3a1306df1e5c8dd8964e26ce1cc))
* add execute quote ([#87](https://github.com/shapeshift/lib/issues/87)) ([463a06d](https://github.com/shapeshift/lib/commit/463a06d003b991433a4246a7a55db806284ba03f))
* get min max ([#93](https://github.com/shapeshift/lib/issues/93)) ([26b788d](https://github.com/shapeshift/lib/commit/26b788d48bd7b7aa27c5d2386ac6fb0e6bff1fd9))
