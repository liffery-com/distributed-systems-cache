import { client, DistributedSystemsCache } from '@/index';
import connect from 'async-redis-shared/connect';

export interface MsRolesPermissionsRole {
  permissions: string[];
}

let cachePopulatorCalled = false;
const permissionCache = new DistributedSystemsCache<MsRolesPermissionsRole>({
  verboseLog: true,
  cacheKeyPrefix: 'RolesPermissionsCache:',
  cachePopulator: () => {
    cachePopulatorCalled = true;
  }
});

beforeAll(async () => {
  await connect({
    db: 0
  });
  await client().flushdb();
});

it('too old should return true', async () => {
  expect(permissionCache.cacheTooOld(321654)).toBe(true);
});

it('too old should return false', async () => {
  const now = new Date().getTime();
  expect(permissionCache.cacheTooOld(now)).toBe(false);
});

it('should add a cache value, and fetch back ok', async () => {
  await permissionCache.setCache('dummy1', { permissions: ['abc', 'def'] });
  const cache = await permissionCache.getCache('dummy1');
  expect(cache.permissions.length).toBe(2);
});

it('should add another cache value, and fetch back both ok', async () => {
  await permissionCache.setCache('dummy2', { permissions: ['abc'] });
  const cache1 = await permissionCache.getCache('dummy1');
  expect(cache1.permissions.length).toBe(2);
  const cache2 = await permissionCache.getCache('dummy2');
  expect(cache2.permissions.length).toBe(1);
});

it('should throw an error when a cache is not found, should also call the populate function', async (done) => {
  try {
    await permissionCache.getCache('dummy3');
    done('Should have thrown an error as the cache does not exist and the call to populate does nothing!');
  } catch (e) {
    expect(cachePopulatorCalled).toBe(true);
    done();
  }
});

it('should est and delete a cache', async (done) => {
  await permissionCache.setCache('dummydel', { permissions: ['abc'] });
  await permissionCache.getCache('dummydel'); // would throw an error if not found
  await permissionCache.clearCacheRecord('dummydel');
  try {
    await permissionCache.getCache('dummydel');
    done('Should have thrown an error as the cache does not exist and the call to populate does nothing!');
  } catch (e) {
    done();
  }
});

it('should add another cache value, and fetch back both ok', async () => {
  const all = await permissionCache.getAll();
  expect(all.length).toBe(2);
});

it('should remove all cache records for this cache layer', async () => {
  await permissionCache.clearAllCacheRecords();
  const all = await permissionCache.getAll();
  expect(all.length).toBe(0);
});
