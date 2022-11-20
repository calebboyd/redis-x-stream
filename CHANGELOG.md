# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0](https://github.com/calebboyd/redis-x-stream/compare/v2.1.0...v3.0.0) (2022-11-20)


### Features

* add control client for adjusting blocking behavior ([fa88e5d](https://github.com/calebboyd/redis-x-stream/commit/fa88e5dd7b3004e3cc3025a2e26ab8e370ec6514))


### BREAKING CHANGES

* only permitted options are accepted

# [2.1.0](https://github.com/calebboyd/redis-x-stream/compare/v2.0.3...v2.1.0) (2022-11-19)


### Features

* remove mode generic ([16434bc](https://github.com/calebboyd/redis-x-stream/commit/16434bcb035fa26694705e011488640db100c97d))

## [2.0.3](https://github.com/calebboyd/redis-x-stream/compare/v2.0.2...v2.0.3) (2022-11-15)


### Bug Fixes

* tweak internal types ([ce61576](https://github.com/calebboyd/redis-x-stream/commit/ce615767bbfce86a81d489d82c2b668c68f8e6a0))

## [2.0.2](https://github.com/calebboyd/redis-x-stream/compare/v2.0.1...v2.0.2) (2022-11-12)


### Bug Fixes

* **deps:** remove ioredis 4 types and update package lock ([ae693dc](https://github.com/calebboyd/redis-x-stream/commit/ae693dc7c7284eb54a3d3e921a6d216d660ae829))

## [2.0.1](https://github.com/calebboyd/redis-x-stream/compare/v2.0.0...v2.0.1) (2022-10-30)


### Bug Fixes

* bump version ([b5db328](https://github.com/calebboyd/redis-x-stream/commit/b5db328e7585865e1b570972287740ecfd7a5ca7))

# [2.0.0](https://github.com/calebboyd/redis-x-stream/compare/v1.4.1...v2.0.0) (2022-10-30)


### Features

* update ioredis ([16b86f7](https://github.com/calebboyd/redis-x-stream/commit/16b86f7e2b716dbd77b95f5fd974a85971c80d77))


### BREAKING CHANGES

* update ioredis to 5x, and drop node < 14

## [1.4.1](https://github.com/calebboyd/redis-x-stream/compare/v1.4.0...v1.4.1) (2022-10-30)


### Bug Fixes

* revert "feat: update ioredis to 5x" ([9fae44c](https://github.com/calebboyd/redis-x-stream/commit/9fae44cfe1808eae24beeffd8fed99bd9494d1d6))

# [1.4.0](https://github.com/calebboyd/redis-x-stream/compare/v1.3.1...v1.4.0) (2022-10-30)


### Features

* update ioredis to 5x ([3aa2b40](https://github.com/calebboyd/redis-x-stream/commit/3aa2b40e396661fac7600dadcbf97374260fb3d5))

## [1.3.1](https://github.com/calebboyd/redis-x-stream/compare/v1.3.0...v1.3.1) (2022-10-30)


### Bug Fixes

* bump version ([15a2764](https://github.com/calebboyd/redis-x-stream/commit/15a2764b58fb61346d6e46a9c083a8271a25e2fc))

# [1.3.0](https://github.com/calebboyd/redis-x-stream/compare/v1.2.1...v1.3.0) (2022-10-30)


### Features

* update dev deps ([075defd](https://github.com/calebboyd/redis-x-stream/commit/075defd077fc21441f97b24bb9a559710ad7d52a))

## [1.2.1](https://github.com/calebboyd/redis-x-stream/compare/v1.2.0...v1.2.1) (2021-02-15)


### Bug Fixes

* more flexible option types ([b9f7e8e](https://github.com/calebboyd/redis-x-stream/commit/b9f7e8e30e3a1c03d5b66bc1e5803dfebea31463))

# [1.2.0](https://github.com/calebboyd/redis-x-stream/compare/v1.1.1...v1.2.0) (2021-02-11)


### Features

* stream factory default export ([08864fe](https://github.com/calebboyd/redis-x-stream/commit/08864fe0601cda28af1af970afbc3393dcf435a3))

## [1.1.1](https://github.com/calebboyd/redis-x-stream/compare/v1.1.0...v1.1.1) (2021-02-08)


### Bug Fixes

* cursor + block for xreadgroup ([28f91b8](https://github.com/calebboyd/redis-x-stream/commit/28f91b88329ab953e83336e4dd8f33f53452bf84))

# [1.1.0](https://github.com/calebboyd/redis-x-stream/compare/v1.0.0...v1.1.0) (2021-01-03)


### Features

* minor bump ([0a2a328](https://github.com/calebboyd/redis-x-stream/commit/0a2a32887fe9e4f8240acc4fe7a06bfdb8b2f4be))

# 1.0.0 (2021-01-03)


### Bug Fixes

* add commonjs indicator to commonjs build ([4bda077](https://github.com/calebboyd/redis-x-stream/commit/4bda0773c41c2e1420adce67df32bb1c4af7ec16))
* release config ([fb3bfff](https://github.com/calebboyd/redis-x-stream/commit/fb3bfffa1555f0ce045e00287456da8bb2fad4e8))
* set max-parallel on actions ([17eae11](https://github.com/calebboyd/redis-x-stream/commit/17eae113161509e120f8a9881132a9bc8e879467))
* set module type in package.json ([587fc40](https://github.com/calebboyd/redis-x-stream/commit/587fc402669438401a756cea75046f6c112ebe55))
* update deps ([311d36d](https://github.com/calebboyd/redis-x-stream/commit/311d36da932be38f85045923fad43dc46c647cd0))
* update deps ([3fc61b5](https://github.com/calebboyd/redis-x-stream/commit/3fc61b5da6d369c807e29b810f869b8391beceba))
* use js extension for esm compat ([a11a4a8](https://github.com/calebboyd/redis-x-stream/commit/a11a4a824b35c48eebed33c6c037ab541cb38b6a))


### Features

* pipelining redis commands ([c7486a5](https://github.com/calebboyd/redis-x-stream/commit/c7486a510e07b6606388c25fd6ec549d18c6e179))
* xreadgroup entries ([383d836](https://github.com/calebboyd/redis-x-stream/commit/383d8363cca19f42e96364f60142b1cce57f405b))
