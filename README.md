# distributed-systems-cache

Set a cache, get a cache, 

## Example use-case

Currently this requires the use of async-redis-shared, connect first somewhere in your app:

```
import { connect } from 'distributed-systems-cache';

// from https://www.npmjs.com/package/async-redis-shared
await connect({
    db: 6,
});
```

The set a model up `PermissionsCache.ts`

```
import { DistributedSystemsCache } from 'distributed-systems-cache'

export interface MsRolesPermissionsRole {
  permissions: string[];
}

export default new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'RolesPermissionsCache:',
  cachePopulator: () => {
    RabbitMQService.msRolesPermissionsRolesRequest({
      fromService: packageJson.name
    });
  }
});
```

The use it:

```
import PermissionsCache form '@/PermissionsCache'

PermissionsCache.get('admin')

PermissionsCache.set('admin': { permissions: ['write', 'read'] })
```
