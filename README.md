# distributed-systems-cache

Set a cache, get a cache, define the cache object shape.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Overview](#overview)
- [API](#api)
    - [construct](#construct)
        - [Options](#options)
    - [Method: setCache](#method-setcache)
    - [Method: getCache](#method-getcache)
    - [Method: getAll](#method-getall)
    - [Method: clearCacheRecord](#method-clearcacherecord)
    - [Method: clearAllCacheRecords](#method-clearallcacherecords)
- [Example](#example)
    - [Connect first somewhere in your app](#connect-first-somewhere-in-your-app)
    - [Set a model up `PermissionsCache.ts`](#set-a-model-up-permissionscachets)
    - [Use it:](#use-it)
- [cacheMaxAgeMs and cachePopulatorMsGraceTime options](#cachemaxagems-and-cachepopulatormsgracetime-options)
- [Developers](#developers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview
- All content is expected to be a js object so everything is stringified on input and parsed on output.
- All keys run through a regex check, ie the bit after the cache key prefix. This regex has a default but can be injected on setup.
- All objects can be passed through a function to filter the persisted content, this must be injected on setup, else nothing is filtered.
- All keys not found will be requested via the injected call to populate on setup, this can be anything from a RMQ call or REST or some arbitrary DB aggregation.
- !Important: the call to populate function should call the setCache on its own, or trigger your application to do so, the response from the call to populate is expected to be void.

## API
#### construct
You must initialise before calling another of the other methods, here are all the options from the source code:  src/DistributedSystemsCache.ts

Here is an example: [Connect first somewhere in your app](#connect-first-somewhere-in-your-app)

###### Options
For all options available and descriptions please see `src/DistributedSystemsCache.ts` 


#### Method: setCache
Set a cache value, pass in a key and an object. The key will be automatically prefixed with the `cacheKeyPrefix`.
The setCache will also add an updatedAt field to the object you provide, this will be used to determine the age of the cache on extraction.
```
async setCache (cacheKey: string, cacheObject: T): Promise<void>
```

#### Method: getCache
Gets a cache by key (excluding the prefix, this is prepended automatically).
If the cache key is not found, the `cachePopulator` callback is called. After the grace time, it will try and fetch the cache again...
It will repeat this up until a cache hit is found, or the qty of tries is equal to the cachePopulatorMaxTries.
Each cache hit is returned and validated/ refreshed.
```
async getCache (cacheKey: string): Promise<T>
```
NB: the `private validateAgeAndFetch` method is called, but the `getCache` doesn't `await` the response. Instead, the callee will only catch and error console a rejected promise at this point.

#### Method: getAll
Does what you would imagine, grabs all the cache values for a given key.

#### Method: clearCacheRecord
Does what you would imagine, for a given cache key, it removes it (as usual, the prefix is added internally):
```typescript
await distributedSystemsCache.clearCacheRecord('admin')
```

#### Method: clearAllCacheRecords
Does what you would imagine, clears all records for instantiated prefix:
```typescript
await distributedSystemsCache.clearAllCacheRecords()
```

## Example

Currently this requires the use of async-redis-shared.

#### Connect first somewhere in your app
```typescript
import { connect } from 'distributed-systems-cache';

// from https://www.npmjs.com/package/async-redis-shared
await connect({
    db: 6,
});
```

#### Set a model up `PermissionsCache.ts`
```typescript
import { DistributedSystemsCache } from 'distributed-systems-cache'

// the cache definition
export interface MsRolesPermissionsRole {
  permissions: string[];
}

// instantiate, declaring the cachePopulator and cacheKeyPrefix
export default new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'RolesPermissionsCache:',
  cacheKeyReplaceRegex: new Regex(/:/gm), // replace the default to only replace :
  cacheKeyReplaceWith: '-', // replace the default _ with -
  cachePopulator: (packageJsonName: string) => {
    // This function will be called when the cache is either not found or too old
    // This function should do something that will create a new cache object based 
    // on the cache key requests
    RabbitMQService.msRolesPermissionsRolesRequest({
      fromService: packageJsonName
    });
  },
  cachePopulatorDelete: false, // When this is true, the cache populator will not be called and a cache miss will return undefined. You should refill this cache on your own
  cacheMaxAgeMs: 1000 * 60 * 60 * 24 * 7, // 1 week life
  cachePopulatorMsGraceTime: 200,
  cachePopulatorMaxTries: 3,
  // Ensuring that we only persist what we need from the provided cache set data
  cacheSetFilter: (input: any): MsRolesPermissionsRole => {
    return input.map((input: any) => {
      return {
        permissions: input.permissions,
      };
    });
  }
});
```

#### Use it:

```
import PermissionsCache form '@/PermissionsCache'

// get the permissions for the role admin
await PermissionsCache.get('admin')

// or set the permissions for the role admin
await PermissionsCache.set('admin': { permissions: ['write', 'read'] })
```

If you set the cachePopulatorDelete to true you will have check the cache exists
```
import PermissionsCache form '@/PermissionsCache'

// get the permissions for the role admin
const cache = await PermissionsCache.get('admin')

if(!cache){
  // do something
} 
```


## cacheMaxAgeMs and cachePopulatorMsGraceTime options
Both the cacheMaxAgeMs and cachePopulatorMsGraceTime have default values that can be overriden by injecting a number replacement or a string to be coverted to a millisecond timestamp with https://www.npmjs.com/package/ms.

(ms timestamps can be a pain to type out over and over hence https://www.npmjs.com/package/ms)

eg with strings:
```typescript
export default new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'MyCache:',
  cacheMaxAgeMs: '5 days', // translates to 1000 * 60 * 60 * 24 * 5
  cachePopulatorMsGraceTime: '2m', // translates to 1000 * 60 * 2
  cachePopulator: () => {  /* some populator */ },
});
```

eg with numbers:
```typescript
export default new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'MyCache:',
  cacheMaxAgeMs: 1000 * 60 * 60, // 1 hour
  cachePopulatorMsGraceTime: 1000 * 60, // 1 min
  cachePopulator: () => {  /* some populator */ },
});
```

## Developers

Start at the unit tests:  `src/__tests__/DistributedSystemsCache.spec.ts`

Additionally, to run the tests you need redis running on local host for now. 

But you cannot publish unless the tests pass.. :)
