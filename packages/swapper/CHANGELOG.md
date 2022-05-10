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
