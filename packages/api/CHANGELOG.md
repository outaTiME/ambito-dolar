# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.1.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@3.0.1...@ambito-dolar/api@3.1.0) (2022-07-04)


### Features

* add sentry for serverless monitoring ([722e2c5](https://github.com/outaTiME/ambito-dolar/commit/722e2c5350aecb8232378bf47a9109d44451e034))





## [3.0.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@3.0.0...@ambito-dolar/api@3.0.1) (2022-07-01)


### Bug Fixes

* update jpeg quality for social images ([22ec63f](https://github.com/outaTiME/ambito-dolar/commit/22ec63fae95007def1109f131e5ca45abd94acef))
* use jpeg for ig and leave png for notifications to avoid loss ([4cf2e98](https://github.com/outaTiME/ambito-dolar/commit/4cf2e986c154da2c20c6b1a25a9157864b8fa086))





# [3.0.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.6.0...@ambito-dolar/api@3.0.0) (2022-06-27)


### Bug Fixes

* handle new change message format for social ([30df0f5](https://github.com/outaTiME/ambito-dolar/commit/30df0f5858ee4713db3295ee75f8584bfc220592))
* rollback to jpeg format which required by IG ([172a73a](https://github.com/outaTiME/ambito-dolar/commit/172a73a7b09142c18b3796fbb13acd06255343d1))


### Features

* add CCB to social notifications ([f4eceec](https://github.com/outaTiME/ambito-dolar/commit/f4eceecd752ef62ad082823a607036b41d8c3b5b))
* new format (PNG) in social images to improve quality ([cb0d320](https://github.com/outaTiME/ambito-dolar/commit/cb0d320cbb6e9e0cfd511f3460824fe918cc2393))
* new sizes for social images ([d8af68c](https://github.com/outaTiME/ambito-dolar/commit/d8af68c0cf593af525cdc6509006f76ed221b1ed))
* upgrade to SST v1.x ([2191ab0](https://github.com/outaTiME/ambito-dolar/commit/2191ab07a4a1c2288edbde9d1ac0ad469dd33b49))


### BREAKING CHANGES

* all services now run on aws





# [2.6.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.5.0...@ambito-dolar/api@2.6.0) (2022-06-09)


### Features

* future rate type removed ([d3c388d](https://github.com/outaTiME/ambito-dolar/commit/d3c388df9301c02122b750728b488009c70902a0))
* update notification style for beta clients ([c5e5c34](https://github.com/outaTiME/ambito-dolar/commit/c5e5c3437bbb49227d7cf3332073a54a931a157a))





# [2.5.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.4.0...@ambito-dolar/api@2.5.0) (2022-06-07)


### Features

* new notification style for beta clients ([402045e](https://github.com/outaTiME/ambito-dolar/commit/402045e3d32d09ee73678d1c1f879c07c147d591))





# [2.4.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.3.0...@ambito-dolar/api@2.4.0) (2022-06-05)


### Bug Fixes

* force boolean values in process message ([5c02537](https://github.com/outaTiME/ambito-dolar/commit/5c0253703ce98b0f68926bb44c240e21537fa6de))
* improve use of getNumber for process ([4d1a89e](https://github.com/outaTiME/ambito-dolar/commit/4d1a89eabcf4f06037dd9c528be706255203572e))
* update timeout for process ([75586a8](https://github.com/outaTiME/ambito-dolar/commit/75586a8bd42d49d4da36cadcefcca340b89d1c3c))


### Features

* update process to get multiple crypto rates in a single call ([5b1ae26](https://github.com/outaTiME/ambito-dolar/commit/5b1ae26387b6367f74f9d2061e93b5669f8fc72e))
* update variation threshold for non-realtime notifications ([b2cbe67](https://github.com/outaTiME/ambito-dolar/commit/b2cbe6779c6a13747abeca82920790e83bf709d2))


### Performance Improvements

* add duration traces for the process ([3c3bcda](https://github.com/outaTiME/ambito-dolar/commit/3c3bcda6203a09b09bf248d74f004f41b5d51329))





# [2.3.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.2.0...@ambito-dolar/api@2.3.0) (2022-05-27)


### Bug Fixes

* exclude zero values from processing ([8d4e3a2](https://github.com/outaTiME/ambito-dolar/commit/8d4e3a2a70b793731b56e2387c68ed3e8daab5b9))


### Features

* new endpoint to update rates ([b7dc070](https://github.com/outaTiME/ambito-dolar/commit/b7dc070b3b7a621178a2a79bd12e73a8d1857239))





# [2.2.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.1.1...@ambito-dolar/api@2.2.0) (2022-05-19)


### Features

* add new optimized attributes in firebase ([e203014](https://github.com/outaTiME/ambito-dolar/commit/e2030142064597b62c989b35c987ad49f7434c7a))





## [2.1.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.1.0...@ambito-dolar/api@2.1.1) (2022-03-29)


### Bug Fixes

* reduce the number of parallel scans ([78f078b](https://github.com/outaTiME/ambito-dolar/commit/78f078b0c5fa868a77bea01a7af2595527d1ad6f))





# [2.1.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@2.0.0...@ambito-dolar/api@2.1.0) (2022-03-25)


### Features

* update to v3 of AWS SDK ([78f7db9](https://github.com/outaTiME/ambito-dolar/commit/78f7db93b1f5423ada039801637d178cfdd93c53))





# [2.0.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.9.0...@ambito-dolar/api@2.0.0) (2022-03-24)


### Bug Fixes

* move API services to AWS using SST ([2692668](https://github.com/outaTiME/ambito-dolar/commit/2692668df5b643acb96bac91e8db26b5faf01d90))
* realtime rates when opening ([ef965f9](https://github.com/outaTiME/ambito-dolar/commit/ef965f94f0aed1e3d60176622c471ecad789f937))


### BREAKING CHANGES

* migrate to AWS using SST due to limited execution times in Vercel





# [1.9.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.8.2...@ambito-dolar/api@1.9.0) (2021-10-20)


### Features

* update variation thresholds and truncate decimals between updates ([f33c90e](https://github.com/outaTiME/ambito-dolar/commit/f33c90e8c24f2a3748c5f0f142918d46ec1b9068))





## [1.8.2](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.8.1...@ambito-dolar/api@1.8.2) (2021-10-19)

**Note:** Version bump only for package @ambito-dolar/api





## [1.8.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.8.0...@ambito-dolar/api@1.8.1) (2021-10-19)

**Note:** Version bump only for package @ambito-dolar/api





# [1.8.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.7.0...@ambito-dolar/api@1.8.0) (2021-10-19)


### Bug Fixes

* remove traces from invalidate ([284d5dd](https://github.com/outaTiME/ambito-dolar/commit/284d5dda082c1075aaad0274ce0c62c1b7ff1f13))


### Features

* future rate type added ([4760937](https://github.com/outaTiME/ambito-dolar/commit/47609379a1d175044e3bf2545b0f1948a1b38f88))





# [1.7.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.6.0...@ambito-dolar/api@1.7.0) (2021-09-14)


### Features

* improvement in the way push notifications are sent to Expo ([0e1f3dd](https://github.com/outaTiME/ambito-dolar/commit/0e1f3ddca0bb50612a4aef3f859aaf1aeaaffb5c))





# [1.6.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.5.1...@ambito-dolar/api@1.6.0) (2021-09-02)


### Features

* increase processing interval for realtime rates and trigger notifications from one place ([e76e07f](https://github.com/outaTiME/ambito-dolar/commit/e76e07fe8e019019fdd3c9fe1236f8b6d165ef44))
* use of promises on aws-sdk queries for better error handling ([2c42f4b](https://github.com/outaTiME/ambito-dolar/commit/2c42f4b44af1caf4252b9d980963b0529f4e1ec2))





## [1.5.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.5.0...@ambito-dolar/api@1.5.1) (2021-08-30)


### Bug Fixes

* remove CCB rate type from legacy files ([37e2f83](https://github.com/outaTiME/ambito-dolar/commit/37e2f833788318b96996d73edfe81bda4f33b226))





# [1.5.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.4.0...@ambito-dolar/api@1.5.0) (2021-08-30)


### Features

* add CCB rate type ([9fa984d](https://github.com/outaTiME/ambito-dolar/commit/9fa984dd3c1b3368bc400dbd36e33aecf687d3b6))





# [1.4.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.3.1...@ambito-dolar/api@1.4.0) (2021-08-23)


### Features

* use S3 to store generated rate images and bump dependencies ([f8aa919](https://github.com/outaTiME/ambito-dolar/commit/f8aa919b0e397cd3dd598248bb06b8cfcf3260a1))





## [1.3.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.3.0...@ambito-dolar/api@1.3.1) (2021-08-20)

**Note:** Version bump only for package @ambito-dolar/api





# [1.3.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.2.0...@ambito-dolar/api@1.3.0) (2021-06-07)


### Features

* **client:** new area chart using reanimated 2 directly instead of react-native-animated-charts ([489bf8c](https://github.com/outaTiME/ambito-dolar/commit/489bf8c9af347f82a9b2198597681b84f4ad93d1))





# [1.2.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.1.0...@ambito-dolar/api@1.2.0) (2021-05-17)


### Features

* **api:** social images now hosted on Imgur instead of S3 ([61b8da8](https://github.com/outaTiME/ambito-dolar/commit/61b8da8b7321509fd8f5d0e04f8f99b080ae1a7e))





# [1.1.0](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.12...@ambito-dolar/api@1.1.0) (2021-05-15)


### Features

* **api:** remove hashtags and send base64 image to ifttt for use on reddit ([07a8011](https://github.com/outaTiME/ambito-dolar/commit/07a8011223829bd8a41e36e4ea3de62a6326142d))





## [1.0.12](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.11...@ambito-dolar/api@1.0.12) (2021-05-13)


### Bug Fixes

* **api:** emulate media feature color scheme on social image ([56952c5](https://github.com/outaTiME/ambito-dolar/commit/56952c523b408f8b582f157764c28fd49bbd2f45))





## [1.0.11](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.10...@ambito-dolar/api@1.0.11) (2021-04-24)

**Note:** Version bump only for package @ambito-dolar/api





## [1.0.10](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.9...@ambito-dolar/api@1.0.10) (2021-04-16)

**Note:** Version bump only for package @ambito-dolar/api





## [1.0.9](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.8...@ambito-dolar/api@1.0.9) (2021-04-16)

**Note:** Version bump only for package @ambito-dolar/api





## [1.0.8](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.7...@ambito-dolar/api@1.0.8) (2021-04-16)


### Bug Fixes

* Stories support for IG and bump dependencies. ([c43c51e](https://github.com/outaTiME/ambito-dolar/commit/c43c51e2f94d20c9e36a8bc9783bd797e19c3878))





## [1.0.7](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.6...@ambito-dolar/api@1.0.7) (2021-04-14)

**Note:** Version bump only for package @ambito-dolar/api





## [1.0.6](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.5...@ambito-dolar/api@1.0.6) (2021-04-14)

**Note:** Version bump only for package @ambito-dolar/api





## [1.0.5](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.4...@ambito-dolar/api@1.0.5) (2021-04-13)


### Bug Fixes

* Better timezonee handling on core, cleanup the code and bump dependencies. ([73980fa](https://github.com/outaTiME/ambito-dolar/commit/73980fafb13ba57546e33a3d410a15c4eac70f16))





## [1.0.4](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.3...@ambito-dolar/api@1.0.4) (2021-04-12)


### Bug Fixes

* Add notification helpers on core. ([8e182d8](https://github.com/outaTiME/ambito-dolar/commit/8e182d863c4198513d3ea6c2c7b3b7e5a341940c))
* Update MIN_CLIENT_VERSION_FOR_WHOLESALER to align with new client version. ([90a0d49](https://github.com/outaTiME/ambito-dolar/commit/90a0d49f5776af3a98fe5345e3c1c0a2114af3ef))





## [1.0.3](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.2...@ambito-dolar/api@1.0.3) (2021-04-06)


### Bug Fixes

* Add expo client on shared. ([cb44c29](https://github.com/outaTiME/ambito-dolar/commit/cb44c29830068ff797d62ae224702d218c4d4d03))
* Issue when empty rates on notify, encoding issue with providers, split firebase operations to reuse access tokens and upgrade chrome-aws-lambda to prevent issues on vercel. ([c392c1f](https://github.com/outaTiME/ambito-dolar/commit/c392c1fbba853ad71629e90565eedc54dc2bc88a))





## [1.0.2](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.1...@ambito-dolar/api@1.0.2) (2021-04-05)


### Bug Fixes

* Leave core as fixed version, use headless chrome 80 for social images and simplest way to authenticate against google. ([b84b25e](https://github.com/outaTiME/ambito-dolar/commit/b84b25ef6cbc07ddfe84baefe79a89bdae0c5fad))





## [1.0.1](https://github.com/outaTiME/ambito-dolar/compare/@ambito-dolar/api@1.0.0...@ambito-dolar/api@1.0.1) (2021-04-05)


### Bug Fixes

* Update dependencies on api. ([3c5f01d](https://github.com/outaTiME/ambito-dolar/commit/3c5f01d5382536be48f2cd23dad7b8c7b7382d7e))





# 1.0.0 (2021-04-04)

**Note:** Version bump only for package @ambito-dolar/api
