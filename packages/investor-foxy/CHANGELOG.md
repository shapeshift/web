# [@shapeshiftoss/investor-foxy-v8.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v8.0.0...@shapeshiftoss/investor-foxy-v8.0.1) (2023-03-03)


### Bug Fixes

* **common:** osmosis keepkey swaps ([#1221](https://github.com/shapeshift/lib/issues/1221)) ([156f2ac](https://github.com/shapeshift/lib/commit/156f2acf815fe05a74fdfbe7238f813936f2a2b9))

# [@shapeshiftoss/investor-foxy-v8.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.1.3...@shapeshiftoss/investor-foxy-v8.0.0) (2023-02-28)


### Features

* **investor-foxy:** rename Token_Staking provider to Staking ([#1218](https://github.com/shapeshift/lib/issues/1218)) ([d17ffe5](https://github.com/shapeshift/lib/commit/d17ffe582a5f6c27043079cca0e13d63703c22f4))


### BREAKING CHANGES

* **investor-foxy:** rename DefiType.TokenStaking to DefiType.Staking

# [@shapeshiftoss/investor-foxy-v7.1.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.1.2...@shapeshiftoss/investor-foxy-v7.1.3) (2023-02-24)

# [@shapeshiftoss/investor-foxy-v7.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.1.1...@shapeshiftoss/investor-foxy-v7.1.2) (2023-02-23)


### Bug Fixes

* **chain-adapters:** use snake_case for all osmosis tx fields ([#1205](https://github.com/shapeshift/lib/issues/1205)) ([957569a](https://github.com/shapeshift/lib/commit/957569a5e3460ae56a40d6d8337398504f741a8f))

# [@shapeshiftoss/investor-foxy-v7.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.1.0...@shapeshiftoss/investor-foxy-v7.1.1) (2023-02-11)

# [@shapeshiftoss/investor-foxy-v7.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.0.4...@shapeshiftoss/investor-foxy-v7.1.0) (2023-01-13)


### Features

* add optimism ([#1157](https://github.com/shapeshift/lib/issues/1157)) ([177725d](https://github.com/shapeshift/lib/commit/177725dc04c00ba982bbebe8e84a7edcff395367))

# [@shapeshiftoss/investor-foxy-v7.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.0.3...@shapeshiftoss/investor-foxy-v7.0.4) (2023-01-05)


### Bug Fixes

* normalize deposit amount for approval ([#1153](https://github.com/shapeshift/lib/issues/1153)) ([53e644b](https://github.com/shapeshift/lib/commit/53e644b2e7196161857467d97c0d7e756d52eb06))

# [@shapeshiftoss/investor-foxy-v7.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.0.2...@shapeshiftoss/investor-foxy-v7.0.3) (2023-01-05)


### Bug Fixes

* only inject accountNumber, not full bip44params ([#1147](https://github.com/shapeshift/lib/issues/1147)) ([7e53b6d](https://github.com/shapeshift/lib/commit/7e53b6d517d069d8a1831e4b474405b4e9220dcf))

# [@shapeshiftoss/investor-foxy-v7.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.0.1...@shapeshiftoss/investor-foxy-v7.0.2) (2022-10-19)

# [@shapeshiftoss/investor-foxy-v7.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v7.0.0...@shapeshiftoss/investor-foxy-v7.0.1) (2022-10-12)

# [@shapeshiftoss/investor-foxy-v7.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v6.1.2...@shapeshiftoss/investor-foxy-v7.0.0) (2022-10-12)


### Features

* **chain-adapters:** make bip44Params required in `chain-adapters` ([#1057](https://github.com/shapeshift/lib/issues/1057)) ([9cee51e](https://github.com/shapeshift/lib/commit/9cee51e66cee984adc70475230d1d4893128e5fc))


### BREAKING CHANGES

* **chain-adapters:** Makes bip44Params required in chain-adapters

# [@shapeshiftoss/investor-foxy-v6.1.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v6.1.1...@shapeshiftoss/investor-foxy-v6.1.2) (2022-09-16)

# [@shapeshiftoss/investor-foxy-v6.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v6.1.0...@shapeshiftoss/investor-foxy-v6.1.1) (2022-09-16)

# [@shapeshiftoss/investor-foxy-v6.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v6.0.0...@shapeshiftoss/investor-foxy-v6.1.0) (2022-09-12)


### Features

* add THORChain support ([#1010](https://github.com/shapeshift/lib/issues/1010)) ([d7c3b72](https://github.com/shapeshift/lib/commit/d7c3b72bbda9795f87fa8f73c35926c95026a3c2))

# [@shapeshiftoss/investor-foxy-v6.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v5.0.1...@shapeshiftoss/investor-foxy-v6.0.0) (2022-09-08)


### Features

* **investor-foxy:** accept bip44Params ([#1016](https://github.com/shapeshift/lib/issues/1016)) ([5523da6](https://github.com/shapeshift/lib/commit/5523da623bdd8655976cf3c7e2884460ff02aa6f))


### BREAKING CHANGES

* **investor-foxy:** investor-foxy now expects full `bip44Params` params in tx input methods instead of `accountNumber`

* chore: trigger CI

* chore: trigger CI

# [@shapeshiftoss/investor-foxy-v5.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v5.0.0...@shapeshiftoss/investor-foxy-v5.0.1) (2022-09-02)

# [@shapeshiftoss/investor-foxy-v5.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.1.1...@shapeshiftoss/investor-foxy-v5.0.0) (2022-09-02)


### Features

* use CHAIN_NAMESPACE.Evm & CHAIN_NAMESPACE.CosmosSdk ([#1007](https://github.com/shapeshift/lib/issues/1007)) ([b6c5490](https://github.com/shapeshift/lib/commit/b6c54902c9e84fd628e917e4747acdb6faf3405d)), closes [#1008](https://github.com/shapeshift/lib/issues/1008)


### BREAKING CHANGES

* CHAIN_NAMESPACE.Ethereum is now CHAIN_NAMESPACE.Evm
* CHAIN_NAMESPACE.Cosmos is now CHAIN_NAMESPACE.CosmosSdk

* chore: trigger CI

* chore: trigger ci

* fix: internally bump caip

Co-authored-by: Apotheosis <97164662+0xApotheosis@users.noreply.github.com>

# [@shapeshiftoss/investor-foxy-v4.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.1.0...@shapeshiftoss/investor-foxy-v4.1.1) (2022-08-15)

# [@shapeshiftoss/investor-foxy-v4.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.8...@shapeshiftoss/investor-foxy-v4.1.0) (2022-08-14)


### Features

* **swapper:** add approveAmount swapper API method ([#962](https://github.com/shapeshift/lib/issues/962)) ([8bf11b1](https://github.com/shapeshift/lib/commit/8bf11b15939d437b4fdd5668e75407d5ede931c8))

# [@shapeshiftoss/investor-foxy-v4.0.8](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.7...@shapeshiftoss/investor-foxy-v4.0.8) (2022-07-29)

# [@shapeshiftoss/investor-foxy-v4.0.7](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.6...@shapeshiftoss/investor-foxy-v4.0.7) (2022-07-26)


### Bug Fixes

* unrug lib bump packages ([#910](https://github.com/shapeshift/lib/issues/910)) ([c914e58](https://github.com/shapeshift/lib/commit/c914e58a2832e5bc196d062074499ec46a200d50))

# [@shapeshiftoss/investor-foxy-v4.0.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.5...@shapeshiftoss/investor-foxy-v4.0.6) (2022-07-25)

# [@shapeshiftoss/investor-foxy-v4.0.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.4...@shapeshiftoss/investor-foxy-v4.0.5) (2022-07-25)

# [@shapeshiftoss/investor-foxy-v4.0.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.3...@shapeshiftoss/investor-foxy-v4.0.4) (2022-07-07)

# [@shapeshiftoss/investor-foxy-v4.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.2...@shapeshiftoss/investor-foxy-v4.0.3) (2022-06-29)

# [@shapeshiftoss/investor-foxy-v4.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.1...@shapeshiftoss/investor-foxy-v4.0.2) (2022-06-15)

# [@shapeshiftoss/investor-foxy-v4.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v4.0.0...@shapeshiftoss/investor-foxy-v4.0.1) (2022-06-13)


### Bug Fixes

* add unchained-client devDependencies ([#804](https://github.com/shapeshift/lib/issues/804)) ([809fbda](https://github.com/shapeshift/lib/commit/809fbdae899ab4d8aecc021baa8df8162aae7d86))

# [@shapeshiftoss/investor-foxy-v4.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.4.2...@shapeshiftoss/investor-foxy-v4.0.0) (2022-06-09)


### Features

* **investor-yearn:** use "KnownChainIds" instead of "ChainTypes" ([#779](https://github.com/shapeshift/lib/issues/779)) ([f44bc8f](https://github.com/shapeshift/lib/commit/f44bc8fe4a50951207632fdad4106b645d91686d))


### BREAKING CHANGES

* **investor-yearn:** Requires updated peerDependencies

# [@shapeshiftoss/investor-foxy-v3.4.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.4.1...@shapeshiftoss/investor-foxy-v3.4.2) (2022-06-08)

# [@shapeshiftoss/investor-foxy-v3.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.4.0...@shapeshiftoss/investor-foxy-v3.4.1) (2022-06-08)

# [@shapeshiftoss/investor-foxy-v3.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.3.0...@shapeshiftoss/investor-foxy-v3.4.0) (2022-06-03)


### Features

* **assetService:** consume normalization of Asset properties & use static data ([#746](https://github.com/shapeshift/lib/issues/746)) ([ca87bee](https://github.com/shapeshift/lib/commit/ca87bee46419a03d490a826b2b42c90b49cc3079))

# [@shapeshiftoss/investor-foxy-v3.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.2.0...@shapeshiftoss/investor-foxy-v3.3.0) (2022-06-01)


### Features

* thorchain memo support ([#716](https://github.com/shapeshift/lib/issues/716)) ([fe9762f](https://github.com/shapeshift/lib/commit/fe9762fd7656ef17d93885ff154a991978c3e93b))

# [@shapeshiftoss/investor-foxy-v3.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.1.1...@shapeshiftoss/investor-foxy-v3.2.0) (2022-05-26)


### Features

* thorswapper initialize ([#703](https://github.com/shapeshift/lib/issues/703)) ([73cc081](https://github.com/shapeshift/lib/commit/73cc081b66cc58177415bf425f7899b289cc33af))

# [@shapeshiftoss/investor-foxy-v3.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.1.0...@shapeshiftoss/investor-foxy-v3.1.1) (2022-05-25)

# [@shapeshiftoss/investor-foxy-v3.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.0.1...@shapeshiftoss/investor-foxy-v3.1.0) (2022-05-20)


### Features

* chain and asset utility functions ([#654](https://github.com/shapeshift/lib/issues/654)) ([4e12ce6](https://github.com/shapeshift/lib/commit/4e12ce6fd10cd8bf34e059e63c2a162fb6576932))

# [@shapeshiftoss/investor-foxy-v3.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v3.0.0...@shapeshiftoss/investor-foxy-v3.0.1) (2022-05-18)

# [@shapeshiftoss/investor-foxy-v3.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v2.0.0...@shapeshiftoss/investor-foxy-v3.0.0) (2022-05-18)


### Performance Improvements

* replace enums with dynamically derived object literals ([#656](https://github.com/shapeshift/lib/issues/656)) ([6d2d821](https://github.com/shapeshift/lib/commit/6d2d821318da9db4afec97b1247cf006a5fc42d2))


### BREAKING CHANGES

* the enum removal will need to be handled by consumers to use the new constants.

* chore: remove toString() and associated comment

* chore: remove string litirals

* chore: optimise imports

* chore: use string union for AssetNamespace

* chore: update README

# [@shapeshiftoss/investor-foxy-v2.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.5.1...@shapeshiftoss/investor-foxy-v2.0.0) (2022-05-10)


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

# [@shapeshiftoss/investor-foxy-v1.5.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.5.0...@shapeshiftoss/investor-foxy-v1.5.1) (2022-05-09)


### Performance Improvements

* **caip:** remove caip vernacular ([#625](https://github.com/shapeshift/lib/issues/625)) ([f92b4f0](https://github.com/shapeshift/lib/commit/f92b4f0ed89f4f3352dd0130757fa686a214c6d4))

# [@shapeshiftoss/investor-foxy-v1.5.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.6...@shapeshiftoss/investor-foxy-v1.5.0) (2022-05-06)


### Features

* **caip:** flatten exports ([#560](https://github.com/shapeshift/lib/issues/560)) ([e326522](https://github.com/shapeshift/lib/commit/e3265223dca3c2126b2822395353f6650c4b0342))

# [@shapeshiftoss/investor-foxy-v1.4.6](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.5...@shapeshiftoss/investor-foxy-v1.4.6) (2022-05-05)

# [@shapeshiftoss/investor-foxy-v1.4.5](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.4...@shapeshiftoss/investor-foxy-v1.4.5) (2022-05-05)

# [@shapeshiftoss/investor-foxy-v1.4.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.3...@shapeshiftoss/investor-foxy-v1.4.4) (2022-05-04)

# [@shapeshiftoss/investor-foxy-v1.4.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.2...@shapeshiftoss/investor-foxy-v1.4.3) (2022-05-02)


### Bug Fixes

* removes 3 unnecessary api calls from zrxswapper.  ([#586](https://github.com/shapeshift/lib/issues/586)) ([57d59c8](https://github.com/shapeshift/lib/commit/57d59c8488cceb05cd5e0778b49690d0d2c97b68))

# [@shapeshiftoss/investor-foxy-v1.4.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.1...@shapeshiftoss/investor-foxy-v1.4.2) (2022-05-02)


### Bug Fixes

* unbreak lib build ([#588](https://github.com/shapeshift/lib/issues/588)) ([bff0f3d](https://github.com/shapeshift/lib/commit/bff0f3d351f09ae9693b6b173782e8d8671ca3e4))
* vscode tsconfig errors ([#577](https://github.com/shapeshift/lib/issues/577)) ([50138d0](https://github.com/shapeshift/lib/commit/50138d07b55b730f3bee68fae80414dc6578ee2a))

# [@shapeshiftoss/investor-foxy-v1.4.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.4.0...@shapeshiftoss/investor-foxy-v1.4.1) (2022-04-18)


### Bug Fixes

* use mostly right rebase history if one fails ([#525](https://github.com/shapeshift/lib/issues/525)) ([5dda69f](https://github.com/shapeshift/lib/commit/5dda69ff965b9280e4236cb48b11f95e980dbe38))

# [@shapeshiftoss/investor-foxy-v1.4.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.3.4...@shapeshiftoss/investor-foxy-v1.4.0) (2022-04-18)


### Features

* add transfer toke function + small fix to claimFromTokemak ([#505](https://github.com/shapeshift/lib/issues/505)) ([e035552](https://github.com/shapeshift/lib/commit/e03555207c650adbc19b031eb3f0ede8131be006))

# [@shapeshiftoss/investor-foxy-v1.3.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.3.3...@shapeshiftoss/investor-foxy-v1.3.4) (2022-04-15)


### Bug Fixes

* add cosmos keepkey support ([#529](https://github.com/shapeshift/lib/issues/529)) ([74922b2](https://github.com/shapeshift/lib/commit/74922b282d493d31afada7929ab64f5d875ee032))

# [@shapeshiftoss/investor-foxy-v1.3.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.3.2...@shapeshiftoss/investor-foxy-v1.3.3) (2022-04-05)


### Bug Fixes

* time to claim ([#511](https://github.com/shapeshift/lib/issues/511)) ([447ee11](https://github.com/shapeshift/lib/commit/447ee11306aa502b92b08bce344a627cb489e02b))

# [@shapeshiftoss/investor-foxy-v1.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.3.1...@shapeshiftoss/investor-foxy-v1.3.2) (2022-04-01)


### Bug Fixes

* bignumber error ([#507](https://github.com/shapeshift/lib/issues/507)) ([a9ca964](https://github.com/shapeshift/lib/commit/a9ca964a430193cc7ba2e9d7687da9aafdc25fa6))

# [@shapeshiftoss/investor-foxy-v1.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.3.0...@shapeshiftoss/investor-foxy-v1.3.1) (2022-03-31)


### Bug Fixes

* toString causing error on big numbers ([#506](https://github.com/shapeshift/lib/issues/506)) ([d9f3cad](https://github.com/shapeshift/lib/commit/d9f3cad7e21e2088a19616230940addd552de903))

# [@shapeshiftoss/investor-foxy-v1.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.2.1...@shapeshiftoss/investor-foxy-v1.3.0) (2022-03-29)


### Features

* add toke reward claim functionality ([#484](https://github.com/shapeshift/lib/issues/484)) ([708fb6e](https://github.com/shapeshift/lib/commit/708fb6e9335d8630f1305555186e823ca19ee6e0))

# [@shapeshiftoss/investor-foxy-v1.2.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.2.0...@shapeshiftoss/investor-foxy-v1.2.1) (2022-03-29)

# [@shapeshiftoss/investor-foxy-v1.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.1.1...@shapeshiftoss/investor-foxy-v1.2.0) (2022-03-29)


### Features

* move withdraw type to types package ([#498](https://github.com/shapeshift/lib/issues/498)) ([6a7e7d1](https://github.com/shapeshift/lib/commit/6a7e7d17a025691e37769f5807fa144c8d872b1e))

# [@shapeshiftoss/investor-foxy-v1.1.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.1.0...@shapeshiftoss/investor-foxy-v1.1.1) (2022-03-28)


### Bug Fixes

* foxy rebase logic and types ([#497](https://github.com/shapeshift/lib/issues/497)) ([d680050](https://github.com/shapeshift/lib/commit/d680050525eeaff0bec1c54eca5f1e506fae5e7b))

# [@shapeshiftoss/investor-foxy-v1.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.0.3...@shapeshiftoss/investor-foxy-v1.1.0) (2022-03-25)


### Features

* foxy rebase history ([#492](https://github.com/shapeshift/lib/issues/492)) ([11b8270](https://github.com/shapeshift/lib/commit/11b82703573799fb9575029c6c2d4d40269213d3))

# [@shapeshiftoss/investor-foxy-v1.0.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.0.2...@shapeshiftoss/investor-foxy-v1.0.3) (2022-03-25)


### Bug Fixes

* don't use strings in contract calls ([#489](https://github.com/shapeshift/lib/issues/489)) ([8b7626c](https://github.com/shapeshift/lib/commit/8b7626c92a65f4821156f24412e1db9c7919720f))

# [@shapeshiftoss/investor-foxy-v1.0.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.0.1...@shapeshiftoss/investor-foxy-v1.0.2) (2022-03-23)

# [@shapeshiftoss/investor-foxy-v1.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/investor-foxy-v1.0.0...@shapeshiftoss/investor-foxy-v1.0.1) (2022-03-22)


### Bug Fixes

* add missing type ([#469](https://github.com/shapeshift/lib/issues/469)) ([63096e8](https://github.com/shapeshift/lib/commit/63096e81b2090eacfd6c21cdd22742f2e3869a55))

# @shapeshiftoss/investor-foxy-v1.0.0 (2022-03-21)


### Features

* investor foxy ([#414](https://github.com/shapeshift/lib/issues/414)) ([8b21924](https://github.com/shapeshift/lib/commit/8b21924ff1830d025db6748706bd126e28688606))
