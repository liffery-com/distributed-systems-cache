import client from 'async-redis-shared';
import ms from 'ms';

export interface IDistributedSystemsCache {
  verboseLog?: boolean,
  cacheDefaultValue?: any,
  cacheKeyPrefix: string,
  cacheKeyReplaceRegex?: RegExp,
  cacheKeyReplaceWith?: string,
  cacheMaxAgeMs?: number | string,
  cachePopulator?: (identifier?: string) => Promise<void>,
  cachePopulatorDelete?: boolean,
  cachePopulatorMsGraceTime?: number | string,
  cachePopulatorMaxTries?: number,
  cacheSetFilter?: (input: any) => any
}

export class DistributedSystemsCache<T> {
  /**
   * Log or not
   */
  verboseLog = false;

  /**
   * The default cache value, if passed in.
   * If the cache-populator fails, then the default value will be returned
   * should the value be passed on setup, else an error is thrown
   */
  cacheDefaultValue?: T;

  /**
   * The prefix for this set of cache keys.
   * Required when using 1 redis index for multiple cache record types
   */
  cacheKeyPrefix: string;

  /**
   * A RegExp object that will be used to alter the cache keys.
   * The default replaces all @ and / characters
   */
  cacheKeyReplaceRegex = new RegExp(/\/|@|:/gm);

  /**
   * Each of the reaplce values will be replace with this string
   */
  cacheKeyReplaceWith = '_';

  /**
   * The max age 1 cache record is premitted to live for. Once
   * older than this value, the cachePopulator will be called.
   * Set to -1 for no limit
   */
  cacheMaxAgeMs: number = 24 * 60 * 60 * 1000; // default is 1 day

  /**
   * A function injected on setup that will be called to populate
   * a cache value should one not be found. cachePopulatorDelete
   * will bypass this callback
   */
  cachePopulator: (identifier?: string) => Promise<void> = async () => {
    // placeholder function
  };

  /**
   * When true, the cache will not automatically be repopulated.
   * Instead, when the cache expires it is simply deleted.
   */
  cachePopulatorDelete = false;

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
    this.cacheDefaultValue = input.cacheDefaultValue || this.cacheDefaultValue;
    this.cacheKeyPrefix = input.cacheKeyPrefix;
    this.cacheKeyReplaceRegex = input.cacheKeyReplaceRegex || this.cacheKeyReplaceRegex;
    this.cacheKeyReplaceWith = input.cacheKeyReplaceWith || this.cacheKeyReplaceWith;
    this.cacheMaxAgeMs = this.inputToMs(this.cacheMaxAgeMs, input.cacheMaxAgeMs);
    this.cachePopulatorMsGraceTime = this.inputToMs(this.cachePopulatorMsGraceTime, input.cachePopulatorMsGraceTime);
    this.cachePopulator = input.cachePopulator || this.cachePopulator;
    this.cachePopulatorDelete = input.cachePopulatorDelete || false;
    this.cachePopulatorMaxTries = input.cachePopulatorMaxTries || this.cachePopulatorMaxTries;
    this.cacheSetFilter = input.cacheSetFilter || this.cacheSetFilter;
    this.verboseLog = input.verboseLog || false;
  }

  inputToMs (defaultVal: number, input?: number | string): number {
    switch (typeof input) {
      case 'string':
        const calculated = ms(input);
        if (!calculated) {
          throw new Error('distributed-systems-cache input.cacheMaxAgeMs was provided a string value that could not be converted to a millisecond timestamp');
        }
        return calculated;
      case 'number':
        return input;
      default:
        return defaultVal;
    }
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
      if (!this.cachePopulatorDelete) {
        return;
      }
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

  makeKey (key: string): string {
    return this.cacheKeyPrefix + key.replace(this.cacheKeyReplaceRegex, this.cacheKeyReplaceWith);
  }

  /**
   * Sets the cache into the db, if the cacheSetFilter is provided to this instance on setup
   * then the input will be run through this function
   * @param cacheKey
   * @param cacheObject
   */
  async setCache (cacheKey: string, cacheObject: T): Promise<void> {
    if (this.cacheSetFilter) {
      cacheObject = this.cacheSetFilter(cacheObject);
    }
    await client().setJson(
      this.makeKey(cacheKey),
      Object.assign(cacheObject, {
        updatedAt: new Date().getTime(),
      })
    );
    this.logger('setCache', cacheObject);
  }

  /**
   * Gets a cache key, if the key is not found or is too old a new value will be requested.
   * If no value is found after the request(s) then the default value will be returned
   * If no default is provided on setup, an error is thrown
   * @param cacheKey
   * @param fetchAttempt
   */
  async getCache (cacheKey: string, fetchAttempt = 0): Promise<T | undefined> {
    this.logger('getCache called', { cacheKey });

    const json: T & { updatedAt: number } = await client().getJson(this.makeKey(cacheKey));
    if (!json) {
      this.logger('getCache null', { cacheKey, fetchAttempt });
      if (this.cachePopulatorMaxTries <= fetchAttempt || this.cachePopulatorDelete) {
        if (this.cacheDefaultValue) {
          return this.cacheDefaultValue;
        } else {
          if (this.cachePopulatorDelete) {
            return undefined;
          } else {
            console.log('rejecting: ' + this.cacheKeyPrefix + cacheKey);
            throw new Error('No cache object found, cache not generated within the cachePopulatorMsGraceTime of ' + this.cachePopulatorMsGraceTime);
          }
        }
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

  /**
   * Simple get all for this prefix
   */
  getAll (): Promise<any> {
    return client().keys(this.cacheKeyPrefix + '*');
  }

  /**
   * Simple clear 1 record under this prefix
   */
  clearCacheRecord (cacheKey: string): Promise<boolean> {
    return client().del(this.makeKey(cacheKey));
  }

  /**
   * Crude, clear all records under this prefix
   */
  async clearAllCacheRecords (): Promise<void> {
    const keys = await this.getAll();
    for (let i = 0; i < keys.length; i++) {
      await client().del(keys[i]);
    }
  }
}
