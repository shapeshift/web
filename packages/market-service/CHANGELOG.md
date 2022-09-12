# [@shapeshiftoss/market-service-v7.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v7.0.1...@shapeshiftoss/market-service-v7.1.0) (2022-09-12)


### Features

* add THORChain support ([#1010](https://github.com/shapeshift/lib/issues/1010)) ([d7c3b72](https://github.com/shapeshift/lib/commit/d7c3b72bbda9795f87fa8f73c35926c95026a3c2))

# [@shapeshiftoss/market-service-v7.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v7.0.0...@shapeshiftoss/market-service-v7.0.1) (2022-09-02)

# [@shapeshiftoss/market-service-v7.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.5.1...@shapeshiftoss/market-service-v7.0.0) (2022-09-02)


### Features

* use CHAIN_NAMESPACE.Evm & CHAIN_NAMESPACE.CosmosSdk ([#1007](https://github.com/shapeshift/lib/issues/1007)) ([b6c5490](https://github.com/shapeshift/lib/commit/b6c54902c9e84fd628e917e4747acdb6faf3405d)), closes [#1008](https://github.com/shapeshift/lib/issues/1008)


### BREAKING CHANGES

* CHAIN_NAMESPACE.Ethereum is now CHAIN_NAMESPACE.Evm
* CHAIN_NAMESPACE.Cosmos is now CHAIN_NAMESPACE.CosmosSdk

* chore: trigger CI

* chore: trigger ci

* fix: internally bump caip

Co-authored-by: Apotheosis <97164662+0xApotheosis@users.noreply.github.com>

# [@shapeshiftoss/market-service-v6.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.5.0...@shapeshiftoss/market-service-v6.5.1) (2022-08-15)

# [@shapeshiftoss/market-service-v6.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.6...@shapeshiftoss/market-service-v6.5.0) (2022-08-01)


### Features

* **caip & market-service:** handle multiple assets with the same CoinGecko `id` ([#929](https://github.com/shapeshift/lib/issues/929)) ([0bdd0a1](https://github.com/shapeshift/lib/commit/0bdd0a13add10e6a9f6d9aa76b119c155191b7b2))

# [@shapeshiftoss/market-service-v6.4.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.5...@shapeshiftoss/market-service-v6.4.6) (2022-07-29)

# [@shapeshiftoss/market-service-v6.4.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.4...@shapeshiftoss/market-service-v6.4.5) (2022-07-28)


### Bug Fixes

* don't return zero value fiat exchange rates ([#918](https://github.com/shapeshift/lib/issues/918)) ([6216b48](https://github.com/shapeshift/lib/commit/6216b48a2eba76c5df64efe8e816642d2a88cd4e))

# [@shapeshiftoss/market-service-v6.4.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.3...@shapeshiftoss/market-service-v6.4.4) (2022-07-26)


### Bug Fixes

* unrug lib bump packages ([#910](https://github.com/shapeshift/lib/issues/910)) ([c914e58](https://github.com/shapeshift/lib/commit/c914e58a2832e5bc196d062074499ec46a200d50))

# [@shapeshiftoss/market-service-v6.4.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.2...@shapeshiftoss/market-service-v6.4.3) (2022-07-25)

# [@shapeshiftoss/market-service-v6.4.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.1...@shapeshiftoss/market-service-v6.4.2) (2022-07-07)

# [@shapeshiftoss/market-service-v6.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.4.0...@shapeshiftoss/market-service-v6.4.1) (2022-06-29)

# [@shapeshiftoss/market-service-v6.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.3.0...@shapeshiftoss/market-service-v6.4.0) (2022-06-28)


### Features

* use FOX CoinGecko market data for FOXy ([#830](https://github.com/shapeshift/lib/issues/830)) ([b2b4b84](https://github.com/shapeshift/lib/commit/b2b4b84e23a1fa5357558fd3172df8deb2b17460))

# [@shapeshiftoss/market-service-v6.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.2.2...@shapeshiftoss/market-service-v6.3.0) (2022-06-27)


### Features

* avalanche market data ([#833](https://github.com/shapeshift/lib/issues/833)) ([086dc57](https://github.com/shapeshift/lib/commit/086dc57206fa6c07dbce473dc2dac4e1f8461ac5))

# [@shapeshiftoss/market-service-v6.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.2.1...@shapeshiftoss/market-service-v6.2.2) (2022-06-16)


### Bug Fixes

* consistently use Foxy.methods.circulatingSupply for supply ([#828](https://github.com/shapeshift/lib/issues/828)) ([1407938](https://github.com/shapeshift/lib/commit/1407938d1098dd4986fce6e3da11259799b7945e))

# [@shapeshiftoss/market-service-v6.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.2.0...@shapeshiftoss/market-service-v6.2.1) (2022-06-15)

# [@shapeshiftoss/market-service-v6.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.1.0...@shapeshiftoss/market-service-v6.2.0) (2022-06-14)


### Features

* add thorswap approvalNeeded ([#801](https://github.com/shapeshift/lib/issues/801)) ([4902ac4](https://github.com/shapeshift/lib/commit/4902ac453121d7700195662b2ca8ed9a1645d362))

# [@shapeshiftoss/market-service-v6.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.0.1...@shapeshiftoss/market-service-v6.1.0) (2022-06-13)


### Features

* **market-service:** remove ChainTypes ([#794](https://github.com/shapeshift/lib/issues/794)) ([016a16c](https://github.com/shapeshift/lib/commit/016a16c8ad93d6061a8a35c007f47b1d823c8f15))

# [@shapeshiftoss/market-service-v6.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v6.0.0...@shapeshiftoss/market-service-v6.0.1) (2022-06-13)


### Bug Fixes

* **market-service:** remove hard-coded chain adapter URLs ([#798](https://github.com/shapeshift/lib/issues/798)) ([3e8bb90](https://github.com/shapeshift/lib/commit/3e8bb9007c27b67f0f6781e13a47fd108f6d3d55))

# [@shapeshiftoss/market-service-v6.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v5.0.1...@shapeshiftoss/market-service-v6.0.0) (2022-06-09)


### Features

* **market-service:** removed usage of ChainAdapterManager ([#780](https://github.com/shapeshift/lib/issues/780)) ([ee30485](https://github.com/shapeshift/lib/commit/ee30485e312f112f98e65e0b0f4d86d45478186e))


### BREAKING CHANGES

* **market-service:** Requires updated peerDependencies

# [@shapeshiftoss/market-service-v5.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v5.0.0...@shapeshiftoss/market-service-v5.0.1) (2022-06-08)

# [@shapeshiftoss/market-service-v5.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.6.1...@shapeshiftoss/market-service-v5.0.0) (2022-06-08)


### Features

* update btc/eth to use historical tx history and new ws payloads ([#674](https://github.com/shapeshift/lib/issues/674)) ([0189e3b](https://github.com/shapeshift/lib/commit/0189e3b4dd5a3b998ddf285e761ae11dea72f94b))


### BREAKING CHANGES

* unchained-client and chain-adapters

* revert pre release package versions

* revert changes to no breaking packages

* dependencies

* pin package versions

# [@shapeshiftoss/market-service-v4.6.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.6.0...@shapeshiftoss/market-service-v4.6.1) (2022-06-08)

# [@shapeshiftoss/market-service-v4.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.5.1...@shapeshiftoss/market-service-v4.6.0) (2022-06-03)


### Features

* **market-service:** foxy supply and maxSupply fields ([#729](https://github.com/shapeshift/lib/issues/729)) ([84b3872](https://github.com/shapeshift/lib/commit/84b387294636304a022e7a2e80b91aed9b68a931))

# [@shapeshiftoss/market-service-v4.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.5.0...@shapeshiftoss/market-service-v4.5.1) (2022-06-03)


### Bug Fixes

* dependency inject market service manager ([#741](https://github.com/shapeshift/lib/issues/741)) ([a6ab9d4](https://github.com/shapeshift/lib/commit/a6ab9d477335504e50e8d6c309e6a9ffacf5a650))

# [@shapeshiftoss/market-service-v4.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.4.0...@shapeshiftoss/market-service-v4.5.0) (2022-06-02)


### Features

* support coingecko pro with api key ([#738](https://github.com/shapeshift/lib/issues/738)) ([b411cab](https://github.com/shapeshift/lib/commit/b411cab0a8e51d3930a688315a514d83df7d51eb))

# [@shapeshiftoss/market-service-v4.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.3.0...@shapeshiftoss/market-service-v4.4.0) (2022-06-01)


### Features

* thorchain memo support ([#716](https://github.com/shapeshift/lib/issues/716)) ([fe9762f](https://github.com/shapeshift/lib/commit/fe9762fd7656ef17d93885ff154a991978c3e93b))

# [@shapeshiftoss/market-service-v4.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.2.2...@shapeshiftoss/market-service-v4.3.0) (2022-05-26)


### Features

* thorswapper initialize ([#703](https://github.com/shapeshift/lib/issues/703)) ([73cc081](https://github.com/shapeshift/lib/commit/73cc081b66cc58177415bf425f7899b289cc33af))

# [@shapeshiftoss/market-service-v4.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.2.1...@shapeshiftoss/market-service-v4.2.2) (2022-05-25)

# [@shapeshiftoss/market-service-v4.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.2.0...@shapeshiftoss/market-service-v4.2.1) (2022-05-24)

# [@shapeshiftoss/market-service-v4.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.1.0...@shapeshiftoss/market-service-v4.2.0) (2022-05-20)


### Features

* add supply and maxSupply fields to market service response ([#670](https://github.com/shapeshift/lib/issues/670)) ([9ad837b](https://github.com/shapeshift/lib/commit/9ad837bc8b56d105dc4892c242bd25ed15cb0cf0))

# [@shapeshiftoss/market-service-v4.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.0.3...@shapeshiftoss/market-service-v4.1.0) (2022-05-20)


### Features

* chain and asset utility functions ([#654](https://github.com/shapeshift/lib/issues/654)) ([4e12ce6](https://github.com/shapeshift/lib/commit/4e12ce6fd10cd8bf34e059e63c2a162fb6576932))

# [@shapeshiftoss/market-service-v4.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.0.2...@shapeshiftoss/market-service-v4.0.3) (2022-05-19)


### Bug Fixes

* timeframes for fiat rates ([#667](https://github.com/shapeshift/lib/issues/667)) ([38f3d12](https://github.com/shapeshift/lib/commit/38f3d12f0a375a0723755a9402dfd9f3be51ebf8))

# [@shapeshiftoss/market-service-v4.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.0.1...@shapeshiftoss/market-service-v4.0.2) (2022-05-18)


### Bug Fixes

* fetch multiple years for fiat price history ([#660](https://github.com/shapeshift/lib/issues/660)) ([810c899](https://github.com/shapeshift/lib/commit/810c89977614b6fa86a6d855376765f1f52724c3))

# [@shapeshiftoss/market-service-v4.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v4.0.0...@shapeshiftoss/market-service-v4.0.1) (2022-05-18)

# [@shapeshiftoss/market-service-v4.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v3.0.2...@shapeshiftoss/market-service-v4.0.0) (2022-05-18)


### Performance Improvements

* replace enums with dynamically derived object literals ([#656](https://github.com/shapeshift/lib/issues/656)) ([6d2d821](https://github.com/shapeshift/lib/commit/6d2d821318da9db4afec97b1247cf006a5fc42d2))


### BREAKING CHANGES

* the enum removal will need to be handled by consumers to use the new constants.

* chore: remove toString() and associated comment

* chore: remove string litirals

* chore: optimise imports

* chore: use string union for AssetNamespace

* chore: update README

# [@shapeshiftoss/market-service-v3.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v3.0.1...@shapeshiftoss/market-service-v3.0.2) (2022-05-16)


### Bug Fixes

* sort fiat price history by time correctly ([#647](https://github.com/shapeshift/lib/issues/647)) ([845d4dc](https://github.com/shapeshift/lib/commit/845d4dc8f464a25cf4c4cc7498bdac9a9ef22185))

# [@shapeshiftoss/market-service-v3.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v3.0.0...@shapeshiftoss/market-service-v3.0.1) (2022-05-12)

# [@shapeshiftoss/market-service-v3.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.3.0...@shapeshiftoss/market-service-v3.0.0) (2022-05-10)


### Performance Improvements

* **marketService:** replace caip properties with their high-level counterparts ([#607](https://github.com/shapeshift/lib/issues/607)) ([85a7cd2](https://github.com/shapeshift/lib/commit/85a7cd2b7004b425badc7c965385553fe9823ce8))


### BREAKING CHANGES

* **marketService:** updates the market service with caip-free types and vernacular.

* chore: use local FindByAssetIdMarketType

* chore: do not import from source

Co-authored-by: kaladinlight <35275952+kaladinlight@users.noreply.github.com>

# [@shapeshiftoss/market-service-v2.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.2.3...@shapeshiftoss/market-service-v2.3.0) (2022-05-06)


### Features

* **caip:** flatten exports ([#560](https://github.com/shapeshift/lib/issues/560)) ([e326522](https://github.com/shapeshift/lib/commit/e3265223dca3c2126b2822395353f6650c4b0342))

# [@shapeshiftoss/market-service-v2.2.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.2.2...@shapeshiftoss/market-service-v2.2.3) (2022-05-05)

# [@shapeshiftoss/market-service-v2.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.2.1...@shapeshiftoss/market-service-v2.2.2) (2022-05-03)

# [@shapeshiftoss/market-service-v2.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.2.0...@shapeshiftoss/market-service-v2.2.1) (2022-05-02)


### Bug Fixes

* unbreak lib build ([#588](https://github.com/shapeshift/lib/issues/588)) ([bff0f3d](https://github.com/shapeshift/lib/commit/bff0f3d351f09ae9693b6b173782e8d8671ca3e4))
* vscode tsconfig errors ([#577](https://github.com/shapeshift/lib/issues/577)) ([50138d0](https://github.com/shapeshift/lib/commit/50138d07b55b730f3bee68fae80414dc6578ee2a))

# [@shapeshiftoss/market-service-v2.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.1.2...@shapeshiftoss/market-service-v2.2.0) (2022-04-20)


### Features

* fiat to fiat ([#495](https://github.com/shapeshift/lib/issues/495)) ([15dc620](https://github.com/shapeshift/lib/commit/15dc6204a72f82466aeff53b5bf2fe7078f88f15))

# [@shapeshiftoss/market-service-v2.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.1.1...@shapeshiftoss/market-service-v2.1.2) (2022-03-29)

# [@shapeshiftoss/market-service-v2.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.1.0...@shapeshiftoss/market-service-v2.1.1) (2022-03-24)


### Bug Fixes

* fix yearn sdk instantiation ([#481](https://github.com/shapeshift/lib/issues/481)) ([fac8a33](https://github.com/shapeshift/lib/commit/fac8a339f193813e9074953f38d27fbf6b3ea6df))

# [@shapeshiftoss/market-service-v2.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.5...@shapeshiftoss/market-service-v2.1.0) (2022-03-21)


### Features

* implement Foxy asset & market data ([#455](https://github.com/shapeshift/lib/issues/455)) ([0d44ab9](https://github.com/shapeshift/lib/commit/0d44ab931153cffab81a923f24814e41a2f898ba)), closes [#453](https://github.com/shapeshift/lib/issues/453)

# [@shapeshiftoss/market-service-v2.0.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.4...@shapeshiftoss/market-service-v2.0.5) (2022-03-17)

# [@shapeshiftoss/market-service-v2.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.3...@shapeshiftoss/market-service-v2.0.4) (2022-03-16)


### Bug Fixes

* update json rpc ([#442](https://github.com/shapeshift/lib/issues/442)) ([abfb16c](https://github.com/shapeshift/lib/commit/abfb16c3d28fa40bbb20e9834d95dca9d13e008a))

# [@shapeshiftoss/market-service-v2.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.2...@shapeshiftoss/market-service-v2.0.3) (2022-03-14)


### Bug Fixes

* osmosis chart range data ([#423](https://github.com/shapeshift/lib/issues/423)) ([d202cee](https://github.com/shapeshift/lib/commit/d202cee9b3b807eaa3a5d5a8df2d27d1835a19c6))

# [@shapeshiftoss/market-service-v2.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.1...@shapeshiftoss/market-service-v2.0.2) (2022-03-07)


### Bug Fixes

* fix osmosis charts ([#422](https://github.com/shapeshift/lib/issues/422)) ([0b4f5c4](https://github.com/shapeshift/lib/commit/0b4f5c4a97d5489ef03c253376e0170489ba4f5f))

# [@shapeshiftoss/market-service-v2.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v2.0.0...@shapeshiftoss/market-service-v2.0.1) (2022-03-03)

# [@shapeshiftoss/market-service-v2.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.13.0...@shapeshiftoss/market-service-v2.0.0) (2022-03-03)


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

# [@shapeshiftoss/market-service-v1.13.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.12.0...@shapeshiftoss/market-service-v1.13.0) (2022-03-03)


### Features

* osmosis market service ([#394](https://github.com/shapeshift/lib/issues/394)) ([cd613e1](https://github.com/shapeshift/lib/commit/cd613e133f76c00324b5d35fe75ba1ee164f82d7))

# [@shapeshiftoss/market-service-v1.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.11.3...@shapeshiftoss/market-service-v1.12.0) (2022-02-24)


### Features

* market service rate limiter ([#392](https://github.com/shapeshift/lib/issues/392)) ([3e425f8](https://github.com/shapeshift/lib/commit/3e425f82d8df2c95851dd82af1d83c2b8ad1b92f))

# [@shapeshiftoss/market-service-v1.11.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.11.2...@shapeshiftoss/market-service-v1.11.3) (2022-02-22)

# [@shapeshiftoss/market-service-v1.11.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.11.1...@shapeshiftoss/market-service-v1.11.2) (2022-02-18)

# [@shapeshiftoss/market-service-v1.11.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.11.0...@shapeshiftoss/market-service-v1.11.1) (2022-02-17)

# [@shapeshiftoss/market-service-v1.11.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.10.2...@shapeshiftoss/market-service-v1.11.0) (2022-02-16)


### Features

* add isTrusted to description of asset service ([#357](https://github.com/shapeshift/lib/issues/357)) ([49b002f](https://github.com/shapeshift/lib/commit/49b002f240ab29f3e6e85cfa7ef324bd16c7c3e3))

# [@shapeshiftoss/market-service-v1.10.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.10.1...@shapeshiftoss/market-service-v1.10.2) (2022-02-09)

# [@shapeshiftoss/market-service-v1.10.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.10.0...@shapeshiftoss/market-service-v1.10.1) (2022-02-07)


### Bug Fixes

* yearn chart data ([#341](https://github.com/shapeshift/lib/issues/341)) ([9a4dead](https://github.com/shapeshift/lib/commit/9a4dead4a8fe64972941b6a97978f805de0c61d6))

# [@shapeshiftoss/market-service-v1.10.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.9.0...@shapeshiftoss/market-service-v1.10.0) (2022-01-31)


### Features

* 821 extend yearn vaults ([#335](https://github.com/shapeshift/lib/issues/335)) ([ef7f591](https://github.com/shapeshift/lib/commit/ef7f5919f27a9e5db1b2c064fda741f6566c672d))

# [@shapeshiftoss/market-service-v1.9.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.8.0...@shapeshiftoss/market-service-v1.9.0) (2022-01-27)


### Features

* extend market service for pricing data on new tokens ([#327](https://github.com/shapeshift/lib/issues/327)) ([d506d99](https://github.com/shapeshift/lib/commit/d506d99c8e35f92c111bccc09a4a73e12430acb5))

# [@shapeshiftoss/market-service-v1.8.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.7.0...@shapeshiftoss/market-service-v1.8.0) (2022-01-03)


### Features

* short circuit market data calls to providers that don't support that asset ([#292](https://github.com/shapeshift/lib/issues/292)) ([861fc19](https://github.com/shapeshift/lib/commit/861fc19e8bf92a7e84a37a9b61e33a1a10f02d2d))

# [@shapeshiftoss/market-service-v1.7.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.6.0...@shapeshiftoss/market-service-v1.7.0) (2021-12-17)


### Features

* implement yearn market service ([#273](https://github.com/shapeshift/lib/issues/273)) ([d999850](https://github.com/shapeshift/lib/commit/d999850a5ab73de64b77626c4c36edd3da9f3117))

# [@shapeshiftoss/market-service-v1.6.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.5.2...@shapeshiftoss/market-service-v1.6.0) (2021-12-17)


### Features

* implement coincap market service (fixes [#281](https://github.com/shapeshift/lib/issues/281)) ([#286](https://github.com/shapeshift/lib/issues/286)) ([2159a00](https://github.com/shapeshift/lib/commit/2159a005754a8234b87abb648796ea63c69452b3))

# [@shapeshiftoss/market-service-v1.5.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.5.1...@shapeshiftoss/market-service-v1.5.2) (2021-12-08)

# [@shapeshiftoss/market-service-v1.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.5.0...@shapeshiftoss/market-service-v1.5.1) (2021-12-02)

# [@shapeshiftoss/market-service-v1.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.4.1...@shapeshiftoss/market-service-v1.5.0) (2021-11-30)


### Features

* use sibling packages as peerDependencies ([#229](https://github.com/shapeshift/lib/issues/229)) ([7de039e](https://github.com/shapeshift/lib/commit/7de039e89907d98048fe6b1e39b4a1e64377cb50))

# [@shapeshiftoss/market-service-v1.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.4.0...@shapeshiftoss/market-service-v1.4.1) (2021-11-29)

# [@shapeshiftoss/market-service-v1.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.3.2...@shapeshiftoss/market-service-v1.4.0) (2021-11-29)


### Features

* return dates as epoch times ([06de6b8](https://github.com/shapeshift/lib/commit/06de6b8cb684f4565de963c511e849be03906300))

# [@shapeshiftoss/market-service-v1.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.3.1...@shapeshiftoss/market-service-v1.3.2) (2021-11-15)


### Bug Fixes

* update deps ([#228](https://github.com/shapeshift/lib/issues/228)) ([e75d49b](https://github.com/shapeshift/lib/commit/e75d49bac8cef6387bd7934c26f38010326a617e))

# [@shapeshiftoss/market-service-v1.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.3.0...@shapeshiftoss/market-service-v1.3.1) (2021-11-12)


### Bug Fixes

* bump types ([#224](https://github.com/shapeshift/lib/issues/224)) ([fc6ca1c](https://github.com/shapeshift/lib/commit/fc6ca1c5940701131f8421ddbe35f5f8e2d851d3))

# [@shapeshiftoss/market-service-v1.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.2.2...@shapeshiftoss/market-service-v1.3.0) (2021-11-10)


### Features

* add getSendMaxAmount to swapper ([#200](https://github.com/shapeshift/lib/issues/200)) ([1788f5f](https://github.com/shapeshift/lib/commit/1788f5f0aa94334f87452633d572eed4b4feee5d))

# [@shapeshiftoss/market-service-v1.2.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.2.1...@shapeshiftoss/market-service-v1.2.2) (2021-11-10)

# [@shapeshiftoss/market-service-v1.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.2.0...@shapeshiftoss/market-service-v1.2.1) (2021-11-09)


### Bug Fixes

* bump package versions ([#198](https://github.com/shapeshift/lib/issues/198)) ([da6c8f1](https://github.com/shapeshift/lib/commit/da6c8f13eb361aa520f2f1e9fc3e16a3785ed287))

# [@shapeshiftoss/market-service-v1.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.1.0...@shapeshiftoss/market-service-v1.2.0) (2021-11-02)


### Features

* market service market cap functionality ([#153](https://github.com/shapeshift/lib/issues/153)) ([cce22b9](https://github.com/shapeshift/lib/commit/cce22b9398e26ee90c50633941f293e13512a65c))

# [@shapeshiftoss/market-service-v1.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.6...@shapeshiftoss/market-service-v1.1.0) (2021-10-31)


### Features

* adds support for metamask (hdwallet) ([#173](https://github.com/shapeshift/lib/issues/173)) ([bdb3f74](https://github.com/shapeshift/lib/commit/bdb3f744712ad4a865217f44bc83b44b8fa0871b))

# [@shapeshiftoss/market-service-v1.0.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.5...@shapeshiftoss/market-service-v1.0.6) (2021-10-27)

# [@shapeshiftoss/market-service-v1.0.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.4...@shapeshiftoss/market-service-v1.0.5) (2021-10-25)

# [@shapeshiftoss/market-service-v1.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.3...@shapeshiftoss/market-service-v1.0.4) (2021-10-20)


### Bug Fixes

* manually bump internal lib package versions to latest ([#142](https://github.com/shapeshift/lib/issues/142)) ([7711bcd](https://github.com/shapeshift/lib/commit/7711bcd2f00c4884754d9bb911cb3fd724eff182))

# [@shapeshiftoss/market-service-v1.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.2...@shapeshiftoss/market-service-v1.0.3) (2021-10-19)

# [@shapeshiftoss/market-service-v1.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.1...@shapeshiftoss/market-service-v1.0.2) (2021-10-19)


### Bug Fixes

* generic types and type package organization ([#129](https://github.com/shapeshift/lib/issues/129)) ([3bee811](https://github.com/shapeshift/lib/commit/3bee8111d720857595efdeb8a4de06bd9850ca7a))
* various tweaks to get web back in a working ergonomic state ([#135](https://github.com/shapeshift/lib/issues/135)) ([97e507d](https://github.com/shapeshift/lib/commit/97e507d9d52831309587c8e4ef5c8a7deba4c711))

# [@shapeshiftoss/market-service-v1.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/market-service-v1.0.0...@shapeshiftoss/market-service-v1.0.1) (2021-10-12)


### Bug Fixes

* update types ([#115](https://github.com/shapeshift/lib/issues/115)) ([ea989ff](https://github.com/shapeshift/lib/commit/ea989ff67b86ae420b3cd4251401cd5882c791d1))

# @shapeshiftoss/market-service-v1.0.0 (2021-10-07)


### Bug Fixes

* use market service and asset service seperately ([#35](https://github.com/shapeshift/lib/issues/35)) ([81e03b5](https://github.com/shapeshift/lib/commit/81e03b58a30252c171f219e780df807a3dd1d8a1))


### Features

* update eth adapter ([#10](https://github.com/shapeshift/lib/issues/10)) ([6dcdecd](https://github.com/shapeshift/lib/commit/6dcdecd9838a8fb3e490ff0ecaa85d87e3acbd60))
