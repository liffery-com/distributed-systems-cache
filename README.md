# distributed-systems-cache

Set a cache, get a cache, define the cache object shape.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [API](#api)
    - [construct](#construct)
    - [Method: setCache](#method-setcache)
    - [Method: getCache](#method-getcache)
    - [Method: getAll](#method-getall)
    - [Method: clearCacheRecord](#method-clearcacherecord)
    - [Method: clearAllCacheRecords](#method-clearallcacherecords)
- [Example](#example)
    - [Connect first somewhere in your app](#connect-first-somewhere-in-your-app)
    - [Set a model up `PermissionsCache.ts`](#set-a-model-up-permissionscachets)
    - [Use it:](#use-it)
- [Developers](#developers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## API
#### construct
You must initialise before calling another of the other methods, here are all the options:
``` javascript
{
  /* when true logs a lot to the console, nice for development */
  verboseLog?: boolean, 
  
  /* The cache key prefix, you might use 1 redix index for multiple key types, eg "permissions:" */
  cacheKeyPrefix: string, 

  /*
   * In milliseconds, what is the max age of the cache? the default is 1 day, 24 * 60 * 60 * 1000.
   * Set to -1 for infinate, ie noe max age
   */
  cacheMaxAgeMs?: number, 

  /* The function called when the cache is too old or not found */
  cachePopulator?: (identifier?: string) => void,

  /* The time in ms between calling the cachePopulator and then trying to fetch the cache again, default is 150ms */
  cachePopulatorMsGraceTime?: number,

  /* The number of times the cache populator will be called for a cache key, after the max an error is thrown */
  cachePopulatorMaxTries?: number
}
```
Here is an example: [Connect first somewhere in your app](#connect-first-somewhere-in-your-app)


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
```
await distributedSystemsCache.clearCacheRecord('admin')
```

#### Method: clearAllCacheRecords
Does what you would imagine, clears all records for instantiated prefix:
```
await distributedSystemsCache.clearAllCacheRecords()
```

## Example

Currently this requires the use of async-redis-shared.

#### Connect first somewhere in your app
```
import { connect } from 'distributed-systems-cache';

// from https://www.npmjs.com/package/async-redis-shared
await connect({
    db: 6,
});
```

#### Set a model up `PermissionsCache.ts`
```
import { DistributedSystemsCache } from 'distributed-systems-cache'

// the cache definition
export interface MsRolesPermissionsRole {
  permissions: string[];
}

// instantiate, declaring the cachePopulator and cacheKeyPrefix
export default new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'RolesPermissionsCache:',
  cachePopulator: () => {
    RabbitMQService.msRolesPermissionsRolesRequest({
      fromService: packageJson.name
    });
  }
});
```

#### Use it:

```
import PermissionsCache form '@/PermissionsCache'

// get the permissions for the role admin
PermissionsCache.get('admin')

// or set the permissions for the role admin
PermissionsCache.set('admin': { permissions: ['write', 'read'] })
```

## Developers

Start at the unit tests:  `src/__tests__/DistributedSystemsCache.spec.ts`

Additionally, to run the tests you need redis running on local host for now. 

But you cannot publish unless the tests pass.. :)