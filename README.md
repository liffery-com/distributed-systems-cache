# Distributed Systems Cache

A robust caching layer built on top of Redis, designed for distributed systems. It handles cache expiration, automatic population (or deletion), key sanitization, and provides a simple interface for managing cache entries using the `redis-singleton` package for a shared Redis client connection.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Features](#features)
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [1. Initialize Redis Connection](#1-initialize-redis-connection)
  - [2. Create a Cache Instance](#2-create-a-cache-instance)
  - [3. Get Data from Cache](#3-get-data-from-cache)
  - [4. Manually Set Data](#4-manually-set-data)
  - [5. Clear Cache Entries](#5-clear-cache-entries)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

*   **Redis-backed:** Leverages Redis for fast, shared cache storage.
*   **Automatic Cache Population:** Define a function (`cachePopulator`) to automatically fetch and store data when a cache miss occurs or data expires.
*   **Configurable Expiration:** Set maximum age for cache entries using milliseconds or human-readable strings (e.g., `"1 day"`, `"2h"` via the `ms` library).
*   **Optional Deletion on Expiry:** Choose to simply delete expired cache entries instead of repopulating them (`cachePopulatorDelete`).
*   **Grace Period & Retries:** Handles concurrent requests for expired/missing keys gracefully using a short wait time and retry mechanism before potentially failing.
*   **Key Prefixing:** Safely use a single Redis instance for multiple cache types by providing a unique `cacheKeyPrefix`.
*   **Key Sanitization:** Automatically replaces potentially problematic characters in cache keys (configurable).
*   **Data Filtering:** Optionally apply a filter function (`cacheSetFilter`) to data before it's stored in the cache.
*   **Default Value Fallback:** Provide a default value to return if the cache is empty and population fails.
*   **Verbose Logging:** Optional detailed logging for debugging.
*   **TypeScript Support:** Written in TypeScript with exported types.

## Installation

You need to install this package along with its peer dependency `redis`.

```bash
npm install redis
```

## Prerequisites
- A running Redis server accessible by your application. 
- You need to manage the Redis connection using redis-singleton. Ensure you connect before using the cache and disconnect when your application shuts down.

## Core Concepts
- Cache Key: A unique identifier for a piece of data within the cache. The final key stored in Redis will be cacheKeyPrefix + sanitized identifier.
- Expiration (cacheMaxAgeMs): How long a cache entry is considered valid. After this duration, getCache will treat it as stale. 
- Population (cachePopulator): An async function you provide. It's called by getCache when data is missing or stale (unless cachePopulatorDelete is true). Its responsibility is to fetch the fresh data and store it using setCache. 
- Grace Time & Retries: When multiple processes/requests call getCache for a missing/stale key simultaneously, only the first one (or subsequent ones after failures) might trigger the cachePopulator. Others will pause briefly (cachePopulatorMsGraceTime) and retry (cachePopulatorMaxTries) fetching the key, expecting the populator to have finished.

## Usage
### 1. Initialize Redis Connection
Use `redis-singleton` to establish the connection. This should happen before you interact with the DistributedSystemsCache.

```typescript
import { connect, disconnect } from 'redis-singleton';

async function initializeApp() {
  try {
    // Replace with your Redis connection options
    await connect({
      url: 'redis://localhost:6379'
      // Or use host, port, password, etc.
    });
    console.log('Redis connected successfully.');

    // ... Initialize and use your DistributedSystemsCache instances here ...

  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
}

async function shutdownApp() {
  // ... clean up other resources ...
  await disconnect();
  console.log('Redis disconnected.');
}

// Call initializeApp on startup and shutdownApp on exit
initializeApp();

// Graceful shutdown handling
process.on('SIGINT', shutdownApp);
process.on('SIGTERM', shutdownApp);
```

### 2. Create a Cache Instance
Import `DistributedSystemsCache` and instantiate it with your desired configuration.

```typescript
import { DistributedSystemsCache } from 'distributed-systems-cache';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  lastLogin: Date;
}

// Example: User Profile Cache
const userProfileCache = new DistributedSystemsCache<UserProfile>({
  cacheKeyPrefix: 'userprofile:', // REQUIRED: Unique prefix for this cache type
  cacheMaxAgeMs: '1h', // Cache entries expire after 1 hour
  verboseLog: process.env.NODE_ENV !== 'production', // Log more in development

  // Define how to fetch and cache data when it's missing or stale
  cachePopulator: async (userId?: string) => {
    if (!userId) {
      console.error('User profile cachePopulator called without a userId!');
      return; // Or throw an error
    }
    console.log(`Populating cache for user: ${userId}`);
    try {
      // Simulate fetching data from a database or API
      const userProfileData: UserProfile = await fetchUserProfileFromSource(userId);

      // Use the instance's setCache method to store the fetched data
      // The `updatedAt` timestamp is added automatically by setCache
      await userProfileCache.setCache(userId, userProfileData);

      console.log(`Successfully populated cache for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to populate cache for user ${userId}:`, error);
      // Optional: Implement retry logic or error handling specific to data fetching
      // Note: getCache has its own retry mechanism for *checking* the cache,
      // but this populator handles fetching the *source* data.
    }
  },

  // Optional: Provide a default value if cache population fails after retries
  // cacheDefaultValue: { id: 0, name: 'Guest', email: '', lastLogin: new Date(0) },

  // Optional: If true, expired items are just deleted, not repopulated automatically by getCache
  // cachePopulatorDelete: false,

  // Optional: Customize retry behavior
  // cachePopulatorMsGraceTime: 150, // Default: 150ms wait between checks
  // cachePopulatorMaxTries: 3,      // Default: 3 attempts to get populated data
});

// Dummy function for the example
async function fetchUserProfileFromSource(userId: string): Promise<UserProfile> {
  console.log(`--> Simulating DB call for user ${userId}`);
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network latency
  if (userId === 'user_not_found') {
      throw new Error('User not found in source');
  }
  return {
    id: parseInt(userId.split('_')[1], 10),
    name: `User ${userId}`,
    email: `${userId}@example.com`,
    lastLogin: new Date(),
  };
}
```

### 3. Get Data from Cache
Use the `getCache` method. It handles checking expiry, triggering the populator, and retries automatically.

```typescript
async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  try {
    const profile = await userProfileCache.getCache(userId);

    if (profile) {
      console.log(`Cache hit for ${userId}:`, profile);
      // The profile object returned will NOT contain the internal `updatedAt` field.
    } else {
      // This might happen if:
      // 1. cachePopulatorDelete = true and the item expired/was never set.
      // 2. cachePopulator failed repeatedly and no cacheDefaultValue was set.
      console.log(`Cache miss and population failed (or delete=true) for ${userId}.`);
    }
    return profile;

  } catch (error) {
    // This error is thrown if the cache is empty, populator doesn't succeed
    // within the grace time/retries, AND no cacheDefaultValue is provided.
    console.error(`Critical error getting profile for ${userId}:`, error);
    // Handle the failure appropriately (e.g., return default, show error page)
    return undefined; // Or re-throw
  }
}

// Example usage:
(async () => {
    await initializeApp(); // Make sure Redis is connected

    const userId1 = 'user_123';
    const userId2 = 'user_456';

    console.log(`\n--- Getting profile for ${userId1} (first time) ---`);
    await getUserProfile(userId1); // Cache miss, triggers populator

    console.log(`\n--- Getting profile for ${userId1} (second time) ---`);
    await getUserProfile(userId1); // Cache hit

    console.log(`\n--- Getting profile for ${userId2} (first time) ---`);
    await getUserProfile(userId2); // Cache miss, triggers populator

    // Simulate cache expiration (if maxAge was short enough) or manual clearing
    // await userProfileCache.clearCacheRecord(userId1);
    // console.log(`\n--- Getting profile for ${userId1} (after clearing) ---`);
    // await getUserProfile(userId1); // Cache miss, triggers populator again

    await shutdownApp();
})();
```

### 4. Manually Set Data
You can bypass the `cachePopulator` and set data directly using `setCache`. Generally you may want to do this when you know the cache should be set, for instance when a new user is created in another service/system.

```typescript
async function updateUserProfile(userId: string, newData: Partial<UserProfile>) {
    const currentProfile = await userProfileCache.getCache(userId); // Get current data (optional)
    const updatedProfile = { ...currentProfile, ...newData, id: currentProfile?.id || 0 }; // Merge

    // Assume updatedProfile is now a complete UserProfile object
    await userProfileCache.setCache(userId, updatedProfile as UserProfile);
    console.log(`Manually updated cache for user ${userId}`);
}
```

### 5. Clear Cache Entries
```typescript
// Clear a specific user's profile
await userProfileCache.clearCacheRecord('user_123');

// Clear ALL entries managed by this userProfileCache instance (use with caution!)
// await userProfileCache.clearAllCacheRecords();
```



