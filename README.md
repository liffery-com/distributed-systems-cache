# distributed-systems-cache

Cache via redis

## Example use-case

Currently this requires the use of async-redis-shared, connect first somewhere in your app:

```
import connect from 'async-redis-shared/connect';

await connect(config.redis);
```

The set a model up `PermissionsCache.ts`

```
import {DistributedSystemsCache} from 'distributed-systems-cache'

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
