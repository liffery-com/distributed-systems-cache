import client from 'async-redis-shared';

export interface IDistributedSystemsCache {
  verboseLog?: boolean,
  cacheKeyPrefix: string,
  cacheMaxAgeMs?: number,
  cachePopulator?: (identifier?: string) => Promise<void>,
  cachePopulatorMsGraceTime?: number,
  cachePopulatorMaxTries?: number,
  cacheSetFilter?: (input: any) => any
}

export class DistributedSystemsCache<T> {
  /**
   * Log or not
   */
  verboseLog = false;

  /**
   * The prefix for this set of cache keys.
   * Required when using 1 redis index for multiple cache record types
   */
  cacheKeyPrefix: string;

  /**
   * The max age 1 cache record is premitted to live for. Once
   * older than this value, the cachePopulator will be called.
   * Set to -1 for no limit
   */
  cacheMaxAgeMs: number = 24 * 60 * 60 * 1000; // default is 1 day

  /**
   * A function injected on setup that will be called to populate
   * a cache value should one not be found
   */
  cachePopulator: (identifier?: string) => Promise<void>;

  /**
   * The defualt number of tries before the getCache will call the cachePopulate
   * before throwing an error
   */
  cachePopulatorMaxTries = 3;

  /**
   * The amount of time the recursive function will wait before checking
   * the if th cache is ready again
   */
  cachePopulatorMsGraceTime = 150;

  /**
   * When present the input will be run through this injectable function
   */
  cacheSetFilter?: (input: T) => T;

  constructor (input: IDistributedSystemsCache) {
    if (!input.cacheKeyPrefix || input.cacheKeyPrefix === '') {
      throw new Error('DistributedSystemsCache constructor called; the cacheKeyPrefix cannot be an empty string or undefined');
    }
    this.cacheKeyPrefix = input.cacheKeyPrefix;
    this.cacheMaxAgeMs = input.cacheMaxAgeMs || this.cacheMaxAgeMs;
    this.cachePopulator = input.cachePopulator || this.cachePopulator;
    this.cachePopulatorMsGraceTime = input.cachePopulatorMsGraceTime || this.cachePopulatorMsGraceTime;
    this.cachePopulatorMaxTries = input.cachePopulatorMaxTries || this.cachePopulatorMaxTries;
    this.cacheSetFilter = input.cacheSetFilter || this.cacheSetFilter;
    this.verboseLog = input.verboseLog || false;
  }

  logger (msg: string, toLog: Record<any, any>): void {
    if (this.verboseLog) {
      console.log(`${this.cacheKeyPrefix}: ${msg}`, toLog);
    }
  }

  pause (): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, this.cachePopulatorMsGraceTime);
    });
  }

  async validateAgeAndFetch (cacheKey: string, json: T & { updatedAt: number }): Promise<void> {
    if (this.cacheTooOld(json.updatedAt, this.cacheMaxAgeMs)) {
      this.logger('getCache age check too old', { updatedAt: json.updatedAt });
      await this.clearCacheRecord(cacheKey);
      await this.cachePopulator(cacheKey);
    }
  }

  /**
   * Determines is a cache object is too old or not
   * @param timeStamp The internal cache updatedAt entry
   * @param cacheMaxAgeMs -1 is equivalent to infinite
   */
  cacheTooOld (timeStamp: number, cacheMaxAgeMs: number): boolean {
    return cacheMaxAgeMs > -1 ? (new Date().getTime() - timeStamp) > cacheMaxAgeMs : false;
  }

  async setCache (cacheKey: string, cacheObject: T): Promise<void> {
    if (this.cacheSetFilter) {
      cacheObject = this.cacheSetFilter(cacheObject);
    }
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
        console.log('rejecting: ' + this.cacheKeyPrefix + cacheKey);
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
