# Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [2.0.1](#201)
- [2.0.0](#200)
- [1.14.0](#1140)
- [1.12.0](#1120)
- [1.8.0](#180)
- [1.7.0](#170)
- [1.6.0](#160)
- [1.5.0](#150)
- [1.4.0](#140)
- [1.3.0](#130)
- [1.2.0](#120)
- [1.1.1](#111)
- [1.1.0](#110)
- [1.0.0](#100)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

#### 2.0.1
- Typo: package json file main and type folder

#### 2.0.0
- Moved to [`redis-singleton`](https://www.npmjs.com/package/redis-singleton) which uses the latest npm redis client
- Test updated to reflect the small changes seen in the latest redis client

#### [1.14.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.12.0...1.14.0)
- Docs and dependency updates

#### [1.12.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.8.0...1.12.0)

- feat: npm ms added to the cacheMaxAgeMs options for easier cache max age setup [`057ad45`](https://github.com/johndcarmichael/distributed-systems-cache/commit/057ad455f0a73d7e173677670a7856d55dd57a8c)
- ms string to number for the population grace time as well as the cache max age [`3cd67f0`](https://github.com/johndcarmichael/distributed-systems-cache/commit/3cd67f0dda6af8eba5b315647bee3c393e26c8e2)
- when the cache ppulator delete is true do not throw instead return undefined [`2f60e34`](https://github.com/johndcarmichael/distributed-systems-cache/commit/2f60e34d280a20a5279c364cbb2c5d4ed4b3b63d)

#### [1.8.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.7.0...1.8.0)

> 9 October 2021

- - auto changelog added [`ffbdd80`](https://github.com/johndcarmichael/distributed-systems-cache/commit/ffbdd801b9a88ba3413e12d548fc3b3a145b6350)
- cache populator default function [`2bddb34`](https://github.com/johndcarmichael/distributed-systems-cache/commit/2bddb345516e35a23dbe30118e4a7f6f6bdc2d30)
- chore changelog [`23d8893`](https://github.com/johndcarmichael/distributed-systems-cache/commit/23d889306f6a9f93740d3306e0f92ca0d0faa16b)

#### [1.7.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.6.0...1.7.0)

> 15 June 2021

- feat: key replace regex [`ad54c64`](https://github.com/johndcarmichael/distributed-systems-cache/commit/ad54c64dbc6336b2681673c60a1de5028b6060b5)

#### [1.6.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.5.0...1.6.0)

> 11 June 2021

- default value [`95e1fb5`](https://github.com/johndcarmichael/distributed-systems-cache/commit/95e1fb5c525d71769c7e03cf7f5ac107db6ee253)

#### [1.5.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.4.0...1.5.0)

> 11 June 2021

- pre cache save filtering [`dae2851`](https://github.com/johndcarmichael/distributed-systems-cache/commit/dae2851c22d8082f12fc6dd5d98de91eb7bd75c4)

#### [1.4.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.3.0...1.4.0)

> 10 June 2021

- reject with the cache key and prefix for better debugging [`6c9f99b`](https://github.com/johndcarmichael/distributed-systems-cache/commit/6c9f99bf31a9382967fde5c75b9e56fa44e82553)

#### [1.3.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.2.0...1.3.0)

> 6 May 2021

- no max age option by setting to -1  [`fb3951f`](https://github.com/johndcarmichael/distributed-systems-cache/commit/fb3951f3ea2aca653d15769ce54f078ab57f5b84)

#### [1.2.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.1.1...1.2.0)

> 6 May 2021

- cachePopulator is now a promise [`56a059d`](https://github.com/johndcarmichael/distributed-systems-cache/commit/56a059d2669840bfb3fa4fc5ffba1d398abaa053)
- chore: vbump [`2c22bbf`](https://github.com/johndcarmichael/distributed-systems-cache/commit/2c22bbf5562b859902c29cfba7ee1d6820e240f3)

#### [1.1.1](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.1.0...1.1.1)

> 6 May 2021

- docs [`372ce02`](https://github.com/johndcarmichael/distributed-systems-cache/commit/372ce02d2f0b1446c66b13ddc031098e43f18499)

#### [1.1.0](https://github.com/johndcarmichael/distributed-systems-cache/compare/1.0.0...1.1.0)

> 5 May 2021

- ensure the prefix is always set! [`6eb84aa`](https://github.com/johndcarmichael/distributed-systems-cache/commit/6eb84aa1124ba7fef8cdbcb6a9c8bd1b1fe5f346)

#### 1.0.0

> 3 May 2021

- initial code commit [`556f0ab`](https://github.com/johndcarmichael/distributed-systems-cache/commit/556f0abd44ca46c47871afab27c9c99e292bff19)
- tests and readme and v1 published [`b2b9fb7`](https://github.com/johndcarmichael/distributed-systems-cache/commit/b2b9fb725067fe345873ff62184d7b65d91193df)
- Initial commit [`af2a968`](https://github.com/johndcarmichael/distributed-systems-cache/commit/af2a96850f94d2614a4f1f74149dd75890d183bd)
