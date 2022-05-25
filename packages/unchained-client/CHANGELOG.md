# [@shapeshiftoss/unchained-client-v8.3.4](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.3.3...@shapeshiftoss/unchained-client-v8.3.4) (2022-05-25)

# [@shapeshiftoss/unchained-client-v8.3.3](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.3.2...@shapeshiftoss/unchained-client-v8.3.3) (2022-05-24)


### Bug Fixes

* fix osmosis assets & parsing ([#689](https://github.com/shapeshift/lib/issues/689)) ([5360fba](https://github.com/shapeshift/lib/commit/5360fba40c050ef9e793b4b44ab5527cbf73d455))

# [@shapeshiftoss/unchained-client-v8.3.2](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.3.1...@shapeshiftoss/unchained-client-v8.3.2) (2022-05-24)

# [@shapeshiftoss/unchained-client-v8.3.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.3.0...@shapeshiftoss/unchained-client-v8.3.1) (2022-05-20)

# [@shapeshiftoss/unchained-client-v8.3.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.2.0...@shapeshiftoss/unchained-client-v8.3.0) (2022-05-20)


### Features

* chain and asset utility functions ([#654](https://github.com/shapeshift/lib/issues/654)) ([4e12ce6](https://github.com/shapeshift/lib/commit/4e12ce6fd10cd8bf34e059e63c2a162fb6576932))

# [@shapeshiftoss/unchained-client-v8.2.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.1.0...@shapeshiftoss/unchained-client-v8.2.0) (2022-05-18)


### Features

* osmosis adapter ([#664](https://github.com/shapeshift/lib/issues/664)) ([8bcdfd1](https://github.com/shapeshift/lib/commit/8bcdfd17a9902fb08239c4b4a2db3ae6b6e15183))

# [@shapeshiftoss/unchained-client-v8.1.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.0.1...@shapeshiftoss/unchained-client-v8.1.0) (2022-05-18)


### Features

* add uni-v2 staking parser ([#648](https://github.com/shapeshift/lib/issues/648)) ([4e09ab7](https://github.com/shapeshift/lib/commit/4e09ab73c5768df4368e59aad7eb4107ef4dede7))

# [@shapeshiftoss/unchained-client-v8.0.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v8.0.0...@shapeshiftoss/unchained-client-v8.0.1) (2022-05-18)

# [@shapeshiftoss/unchained-client-v8.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v7.0.0...@shapeshiftoss/unchained-client-v8.0.0) (2022-05-18)


### Performance Improvements

* replace enums with dynamically derived object literals ([#656](https://github.com/shapeshift/lib/issues/656)) ([6d2d821](https://github.com/shapeshift/lib/commit/6d2d821318da9db4afec97b1247cf006a5fc42d2))


### BREAKING CHANGES

* the enum removal will need to be handled by consumers to use the new constants.

* chore: remove toString() and associated comment

* chore: remove string litirals

* chore: optimise imports

* chore: use string union for AssetNamespace

* chore: update README

# [@shapeshiftoss/unchained-client-v7.0.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v6.12.1...@shapeshiftoss/unchained-client-v7.0.0) (2022-05-10)


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

# [@shapeshiftoss/unchained-client-v6.12.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v6.12.0...@shapeshiftoss/unchained-client-v6.12.1) (2022-05-09)


### Performance Improvements

* **caip:** remove caip vernacular ([#625](https://github.com/shapeshift/lib/issues/625)) ([f92b4f0](https://github.com/shapeshift/lib/commit/f92b4f0ed89f4f3352dd0130757fa686a214c6d4))

# [@shapeshiftoss/unchained-client-v6.12.0](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v6.11.1...@shapeshiftoss/unchained-client-v6.12.0) (2022-05-06)


### Features

* **caip:** flatten exports ([#560](https://github.com/shapeshift/lib/issues/560)) ([e326522](https://github.com/shapeshift/lib/commit/e3265223dca3c2126b2822395353f6650c4b0342))

# [@shapeshiftoss/unchained-client-v6.11.1](https://github.com/shapeshift/lib/compare/@shapeshiftoss/unchained-client-v6.11.0...@shapeshiftoss/unchained-client-v6.11.1) (2022-05-05)

# @shapeshiftoss/unchained-client-v6.11.0 (2022-05-05)

### Features

- unchained client ([#603](https://github.com/shapeshift/lib/issues/603)) ([0e0df76](https://github.com/shapeshift/lib/commit/0e0df7654cd8d9a5ebcab5ce4bb54d825981440b))
