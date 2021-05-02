import client from 'async-redis-shared';

interface IDistributedSystemsCache {
  cacheKeyPrefix: string,
  cacheMaxAgeMs?: number,
  cachePopulator: () => void,
  cachePopulatorMsGraceTime?: number,
  cachePopulatorMaxTries?: number,
}

export class DistributedSystemsCache<T> {

  cacheKeyPrefix: string;
  cacheMaxAgeMs: number = 24 * 60 * 60 * 1000; // default is 1 day
  cachePopulator: (identifier: string) => void;
  cachePopulatorMaxTries = 1;
  cachePopulatorMsGraceTime = 150;

  constructor (input: IDistributedSystemsCache) {
    this.cacheKeyPrefix = input.cacheKeyPrefix;
    this.cacheMaxAgeMs = input.cacheMaxAgeMs || this.cacheMaxAgeMs;
    this.cachePopulator = input.cachePopulator;
    this.cachePopulatorMsGraceTime = input.cachePopulatorMsGraceTime || this.cachePopulatorMsGraceTime;
    this.cachePopulatorMaxTries = input.cachePopulatorMaxTries || this.cachePopulatorMaxTries;
  }

  async setCache (cacheKey: string, cacheObject: T): Promise<void> {
    await client().setJson(
      this.cacheKeyPrefix + cacheKey,
      Object.assign(cacheObject, {
        updatedAt: new Date().getTime(),
      })
    );
  }

  getCache (cacheKey: string, fetchAttempt = 0): Promise<T> {
    return new Promise(async (resolve) => {
      const json: T & { updatedAt: number } = await client().getJson(this.cacheKeyPrefix + cacheKey);
      if (!json) {
        if (fetchAttempt === this.cachePopulatorMaxTries) {
          throw new Error('No cache object found, cache not generated within the cachePopulatorMsGraceTime of ' + this.cachePopulatorMsGraceTime);
        }
        ++fetchAttempt;
        this.cachePopulator(cacheKey);
        setTimeout(() => this.getCache(cacheKey, fetchAttempt), this.cachePopulatorMsGraceTime);
      } else {
        resolve(json);
        if (this.cacheTooOld(json.updatedAt)) {
          await this.clearCacheRecord(cacheKey);
          this.cachePopulator(cacheKey);
        }
      }
    });
  }

  cacheTooOld (timeStamp: number): boolean {
    return (new Date().getTime() - timeStamp) > this.cacheMaxAgeMs;
  }

  clearCacheRecord (cacheKey: string): Promise<boolean> {
    return client().del(cacheKey);
  }
}
