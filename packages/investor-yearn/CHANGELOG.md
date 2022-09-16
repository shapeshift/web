# [@shapeshiftoss/investor-yearn-v6.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v6.1.0...@shapeshiftoss/investor-yearn-v6.1.1) (2022-09-16)

# [@shapeshiftoss/investor-yearn-v6.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v6.0.0...@shapeshiftoss/investor-yearn-v6.1.0) (2022-09-12)


### Features

* add THORChain support ([#1010](https://github.com/shapeshift/lib/issues/1010)) ([d7c3b72](https://github.com/shapeshift/lib/commit/d7c3b72bbda9795f87fa8f73c35926c95026a3c2))

# [@shapeshiftoss/investor-yearn-v6.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v5.0.1...@shapeshiftoss/investor-yearn-v6.0.0) (2022-09-08)


### Features

* **investor-yearn:** accept bip44Params in signAndBroadcast input ([#1014](https://github.com/shapeshift/lib/issues/1014)) ([dc65033](https://github.com/shapeshift/lib/commit/dc65033851000a476db4f3ac073d26c40094969c))


### BREAKING CHANGES

* **investor-yearn:** signAndBroadcast now accepts an optional bip44Params property and will throw if not passed.

# [@shapeshiftoss/investor-yearn-v5.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v5.0.0...@shapeshiftoss/investor-yearn-v5.0.1) (2022-09-02)

# [@shapeshiftoss/investor-yearn-v5.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.1.1...@shapeshiftoss/investor-yearn-v5.0.0) (2022-09-02)


### Features

* use CHAIN_NAMESPACE.Evm & CHAIN_NAMESPACE.CosmosSdk ([#1007](https://github.com/shapeshift/lib/issues/1007)) ([b6c5490](https://github.com/shapeshift/lib/commit/b6c54902c9e84fd628e917e4747acdb6faf3405d)), closes [#1008](https://github.com/shapeshift/lib/issues/1008)


### BREAKING CHANGES

* CHAIN_NAMESPACE.Ethereum is now CHAIN_NAMESPACE.Evm
* CHAIN_NAMESPACE.Cosmos is now CHAIN_NAMESPACE.CosmosSdk

* chore: trigger CI

* chore: trigger ci

* fix: internally bump caip

Co-authored-by: Apotheosis <97164662+0xApotheosis@users.noreply.github.com>

# [@shapeshiftoss/investor-yearn-v4.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.1.0...@shapeshiftoss/investor-yearn-v4.1.1) (2022-08-15)

# [@shapeshiftoss/investor-yearn-v4.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.7...@shapeshiftoss/investor-yearn-v4.1.0) (2022-08-14)


### Features

* **swapper:** add approveAmount swapper API method ([#962](https://github.com/shapeshift/lib/issues/962)) ([8bf11b1](https://github.com/shapeshift/lib/commit/8bf11b15939d437b4fdd5668e75407d5ede931c8))

# [@shapeshiftoss/investor-yearn-v4.0.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.6...@shapeshiftoss/investor-yearn-v4.0.7) (2022-07-29)

# [@shapeshiftoss/investor-yearn-v4.0.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.5...@shapeshiftoss/investor-yearn-v4.0.6) (2022-07-26)


### Bug Fixes

* unrug lib bump packages ([#910](https://github.com/shapeshift/lib/issues/910)) ([c914e58](https://github.com/shapeshift/lib/commit/c914e58a2832e5bc196d062074499ec46a200d50))

# [@shapeshiftoss/investor-yearn-v4.0.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.4...@shapeshiftoss/investor-yearn-v4.0.5) (2022-07-25)

# [@shapeshiftoss/investor-yearn-v4.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.3...@shapeshiftoss/investor-yearn-v4.0.4) (2022-07-07)

# [@shapeshiftoss/investor-yearn-v4.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.2...@shapeshiftoss/investor-yearn-v4.0.3) (2022-06-29)

# [@shapeshiftoss/investor-yearn-v4.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.1...@shapeshiftoss/investor-yearn-v4.0.2) (2022-06-15)

# [@shapeshiftoss/investor-yearn-v4.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v4.0.0...@shapeshiftoss/investor-yearn-v4.0.1) (2022-06-13)


### Bug Fixes

* add unchained-client devDependencies ([#804](https://github.com/shapeshift/lib/issues/804)) ([809fbda](https://github.com/shapeshift/lib/commit/809fbdae899ab4d8aecc021baa8df8162aae7d86))

# [@shapeshiftoss/investor-yearn-v4.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v3.0.3...@shapeshiftoss/investor-yearn-v4.0.0) (2022-06-09)


### Features

* **investor-yearn:** use "KnownChainIds" instead of "ChainTypes" ([#779](https://github.com/shapeshift/lib/issues/779)) ([f44bc8f](https://github.com/shapeshift/lib/commit/f44bc8fe4a50951207632fdad4106b645d91686d))


### BREAKING CHANGES

* **investor-yearn:** Requires updated peerDependencies

# [@shapeshiftoss/investor-yearn-v3.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v3.0.2...@shapeshiftoss/investor-yearn-v3.0.3) (2022-06-08)

# [@shapeshiftoss/investor-yearn-v3.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v3.0.1...@shapeshiftoss/investor-yearn-v3.0.2) (2022-06-08)

# [@shapeshiftoss/investor-yearn-v3.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v3.0.0...@shapeshiftoss/investor-yearn-v3.0.1) (2022-06-06)


### Bug Fixes

* fixed bug where we were depositing to wrong contract ([#755](https://github.com/shapeshift/lib/issues/755)) ([2bf8964](https://github.com/shapeshift/lib/commit/2bf8964a8d3eaf2df2662b6e5788491e112aa160))

# [@shapeshiftoss/investor-yearn-v3.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v2.2.0...@shapeshiftoss/investor-yearn-v3.0.0) (2022-06-06)


### Features

* **investor-yearn:** updated investor-yearn to latest investor-core package   ([#747](https://github.com/shapeshift/lib/issues/747)) ([7bf9631](https://github.com/shapeshift/lib/commit/7bf9631d6d9e903e5018f79824b88902248e3a6d))


### BREAKING CHANGES

* **investor-yearn:** removes the original api and moves over to investor class and opportunity classes

* chore(investor-yearn): fixed linting

* removed buildTxToSign function and did number to hex inside signAndBroadcast

* removed unused code

* chore: updated for earn opportunities.

* chore: added expired tag and lower cased the id

* chore: removed commented out method

* chore: removed comment

Co-authored-by: Chris Thompson <chris@thompson-web.org>

# [@shapeshiftoss/investor-yearn-v2.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v2.1.0...@shapeshiftoss/investor-yearn-v2.2.0) (2022-06-03)


### Features

* **assetService:** consume normalization of Asset properties & use static data ([#746](https://github.com/shapeshift/lib/issues/746)) ([ca87bee](https://github.com/shapeshift/lib/commit/ca87bee46419a03d490a826b2b42c90b49cc3079))

# [@shapeshiftoss/investor-yearn-v2.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v2.0.2...@shapeshiftoss/investor-yearn-v2.1.0) (2022-05-26)


### Features

* thorswapper initialize ([#703](https://github.com/shapeshift/lib/issues/703)) ([73cc081](https://github.com/shapeshift/lib/commit/73cc081b66cc58177415bf425f7899b289cc33af))

# [@shapeshiftoss/investor-yearn-v2.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v2.0.1...@shapeshiftoss/investor-yearn-v2.0.2) (2022-05-24)

# [@shapeshiftoss/investor-yearn-v2.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v2.0.0...@shapeshiftoss/investor-yearn-v2.0.1) (2022-05-18)

# [@shapeshiftoss/investor-yearn-v2.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.8...@shapeshiftoss/investor-yearn-v2.0.0) (2022-05-10)


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

# [@shapeshiftoss/investor-yearn-v1.4.8](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.7...@shapeshiftoss/investor-yearn-v1.4.8) (2022-05-05)

# [@shapeshiftoss/investor-yearn-v1.4.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.6...@shapeshiftoss/investor-yearn-v1.4.7) (2022-05-02)


### Bug Fixes

* removes 3 unnecessary api calls from zrxswapper.  ([#586](https://github.com/shapeshift/lib/issues/586)) ([57d59c8](https://github.com/shapeshift/lib/commit/57d59c8488cceb05cd5e0778b49690d0d2c97b68))

# [@shapeshiftoss/investor-yearn-v1.4.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.5...@shapeshiftoss/investor-yearn-v1.4.6) (2022-05-02)


### Bug Fixes

* unbreak lib build ([#588](https://github.com/shapeshift/lib/issues/588)) ([bff0f3d](https://github.com/shapeshift/lib/commit/bff0f3d351f09ae9693b6b173782e8d8671ca3e4))
* vscode tsconfig errors ([#577](https://github.com/shapeshift/lib/issues/577)) ([50138d0](https://github.com/shapeshift/lib/commit/50138d07b55b730f3bee68fae80414dc6578ee2a))

# [@shapeshiftoss/investor-yearn-v1.4.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.4...@shapeshiftoss/investor-yearn-v1.4.5) (2022-04-15)


### Bug Fixes

* add cosmos keepkey support ([#529](https://github.com/shapeshift/lib/issues/529)) ([74922b2](https://github.com/shapeshift/lib/commit/74922b282d493d31afada7929ab64f5d875ee032))

# [@shapeshiftoss/investor-yearn-v1.4.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.3...@shapeshiftoss/investor-yearn-v1.4.4) (2022-03-24)


### Bug Fixes

* fix yearn sdk instantiation ([#481](https://github.com/shapeshift/lib/issues/481)) ([fac8a33](https://github.com/shapeshift/lib/commit/fac8a339f193813e9074953f38d27fbf6b3ea6df))

# [@shapeshiftoss/investor-yearn-v1.4.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.2...@shapeshiftoss/investor-yearn-v1.4.3) (2022-03-16)


### Bug Fixes

* update json rpc ([#442](https://github.com/shapeshift/lib/issues/442)) ([abfb16c](https://github.com/shapeshift/lib/commit/abfb16c3d28fa40bbb20e9834d95dca9d13e008a))

# [@shapeshiftoss/investor-yearn-v1.4.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.1...@shapeshiftoss/investor-yearn-v1.4.2) (2022-03-03)

# [@shapeshiftoss/investor-yearn-v1.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.4.0...@shapeshiftoss/investor-yearn-v1.4.1) (2022-02-28)

# [@shapeshiftoss/investor-yearn-v1.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.3.3...@shapeshiftoss/investor-yearn-v1.4.0) (2022-02-28)


### Features

* add Cosmos based chain adapters ([#397](https://github.com/shapeshift/lib/issues/397)) ([a0690d7](https://github.com/shapeshift/lib/commit/a0690d700f924d5ff095cfeae072d204e4016708)), closes [#291](https://github.com/shapeshift/lib/issues/291)

# [@shapeshiftoss/investor-yearn-v1.3.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.3.2...@shapeshiftoss/investor-yearn-v1.3.3) (2022-02-22)

# [@shapeshiftoss/investor-yearn-v1.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.3.1...@shapeshiftoss/investor-yearn-v1.3.2) (2022-02-17)

# [@shapeshiftoss/investor-yearn-v1.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.3.0...@shapeshiftoss/investor-yearn-v1.3.1) (2022-02-08)

# [@shapeshiftoss/investor-yearn-v1.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.2.0...@shapeshiftoss/investor-yearn-v1.3.0) (2022-02-07)


### Features

* add transformVault util and change return types ([#346](https://github.com/shapeshift/lib/issues/346)) ([f88da2d](https://github.com/shapeshift/lib/commit/f88da2daca63d779cb8e8f31029b6106ca7f6f52))

# [@shapeshiftoss/investor-yearn-v1.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.1.0...@shapeshiftoss/investor-yearn-v1.2.0) (2022-02-07)


### Features

* expired prop on yearn vaults ([#344](https://github.com/shapeshift/lib/issues/344)) ([4fb3f1a](https://github.com/shapeshift/lib/commit/4fb3f1a6a6a0d2bdcb0ab19e1fa9a94817ce72e2))

# [@shapeshiftoss/investor-yearn-v1.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-yearn-v1.0.0...@shapeshiftoss/investor-yearn-v1.1.0) (2022-02-03)


### Features

* removed dev-dependency and made versioning of yearn sdk consistent ([#340](https://github.com/shapeshift/lib/issues/340)) ([c67cf17](https://github.com/shapeshift/lib/commit/c67cf17a73e2508198a709f5302ae0f2105533e5))

# @shapeshiftoss/investor-yearn-v1.0.0 (2022-02-03)


### Features

* investor-yearn ([#338](https://github.com/shapeshift/lib/issues/338)) ([70d1eab](https://github.com/shapeshift/lib/commit/70d1eabac2d7e398616b3442cef57d5cf810c7ce))
