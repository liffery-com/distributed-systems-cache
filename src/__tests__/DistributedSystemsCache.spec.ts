import { DistributedSystemsCache } from '@/index';

export interface MsRolesPermissionsRole {
  permissions: string[];
}

const permissionCache = new DistributedSystemsCache<MsRolesPermissionsRole>({
  cacheKeyPrefix: 'RolesPermissionsCache:',
  cachePopulator: () => {
    console.log(321);
  }
});

it('too old should return true', async () => {
  expect(permissionCache.cacheTooOld(321654)).toBe(true);
});
