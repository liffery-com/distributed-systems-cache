import client from 'async-redis-shared';

export interface IDistributedSystemsCache {
  verboseLog?: boolean,
  cacheKeyPrefix: string,
  cacheMaxAgeMs?: number,
  cachePopulator?: (identifier?: string) => Promise<void>,
  cachePopulatorMsGraceTime?: number,
  cachePopulatorMaxTries?: number,
}

export class DistributedSystemsCache<T> {
  verboseLog = false;
  cacheKeyPrefix: string;
  cacheMaxAgeMs: number = 24 * 60 * 60 * 1000; // default is 1 day
  cachePopulator: (identifier?: string) => Promise<void>;
  cachePopulatorMaxTries = 1;
  cachePopulatorMsGraceTime = 150;

  constructor (input: IDistributedSystemsCache) {
    if (!input.cacheKeyPrefix || input.cacheKeyPrefix === '') {
      throw new Error('DistributedSystemsCache constructor called; the cacheKeyPrefix cannot be an empty string or undefined');
    }
    this.cacheKeyPrefix = input.cacheKeyPrefix;
    this.cacheMaxAgeMs = input.cacheMaxAgeMs || this.cacheMaxAgeMs;
    this.cachePopulator = input.cachePopulator || this.cachePopulator;
    this.cachePopulatorMsGraceTime = input.cachePopulatorMsGraceTime || this.cachePopulatorMsGraceTime;
    this.cachePopulatorMaxTries = input.cachePopulatorMaxTries || this.cachePopulatorMaxTries;
    this.verboseLog = input.verboseLog || false;
  }

  private logger (msg: string, toLog: Record<any, any>): void {
    if (this.verboseLog) {
      console.log(`${this.cacheKeyPrefix}: ${msg}`, toLog);
    }
  }

  private pause (): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, this.cachePopulatorMsGraceTime);
    });
  }

  private cacheTooOld (timeStamp: number): boolean {
    return (new Date().getTime() - timeStamp) > this.cacheMaxAgeMs;
  }

  private async validateAgeAndFetch (cacheKey: string, json: T & { updatedAt: number }): Promise<void> {
    if (this.cacheTooOld(json.updatedAt)) {
      this.logger('getCache age check too old', { updatedAt: json.updatedAt });
      await this.clearCacheRecord(cacheKey);
      await this.cachePopulator(cacheKey);
    }
  }

  async setCache (cacheKey: string, cacheObject: T): Promise<void> {
    await client().setJson(
      this.cacheKeyPrefix + cacheKey,
      Object.assign(cacheObject, {
        updatedAt: new Date().getTime(),
      })
    );
    this.logger('setCache', cacheObject);
  }

  async getCache (cacheKey: string, fetchAttempt = 0): Promise<T> {
    this.logger('getCache called', { cacheKey });

    const json: T & { updatedAt: number } = await client().getJson(this.cacheKeyPrefix + cacheKey);
    if (!json) {
      this.logger('getCache null', { cacheKey, fetchAttempt });
      if (this.cachePopulatorMaxTries <= fetchAttempt) {
        console.log('rejecting');
        throw new Error('No cache object found, cache not generated within the cachePopulatorMsGraceTime of ' + this.cachePopulatorMsGraceTime);
      }
      ++fetchAttempt;
      this.logger('getCache call to populate called', { cacheKey, fetchAttempt });
      await this.cachePopulator(cacheKey);

      await this.pause();
      return this.getCache(cacheKey, fetchAttempt);
    } else {
      // handle the cache hit
      this.logger('getCache hit', json);
      this.validateAgeAndFetch(cacheKey, json).catch((e) => {
        console.error('Error validating and refreshing the cache:', this.cacheKeyPrefix + cacheKey, json, e);
      });
      return json;
    }
  }

  getAll (): Promise<any> {
    return client().keys(this.cacheKeyPrefix + '*');
  }

  clearCacheRecord (cacheKey: string): Promise<boolean> {
    return client().del(this.cacheKeyPrefix + cacheKey);
  }

  async clearAllCacheRecords (): Promise<void> {
    const keys = await this.getAll();
    for (let i = 0; i < keys.length; i++) {
      await client().del(keys[i]);
    }
  }
}
