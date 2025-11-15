# Fictional Profiles Caching Implementation

## Overview

This document describes the server-side caching implementation for fictional profiles using Next.js `unstable_cache` API. The caching system improves performance by reducing database queries and provides automatic cache invalidation when profiles are modified.

## Architecture

### Cache Strategy

- **Cache Key**: `fictional-profiles` (tag-based caching)
- **TTL**: 5 minutes (300 seconds)
- **Scope**: Server-side only (Next.js cache)
- **Invalidation**: Tag-based revalidation

### Components

1. **Cache Utility** (`lib/utils/cache.ts`)
   - `getCachedFictionalProfiles(gender)` - Fetch profiles by gender with caching
   - `getCachedAllFictionalProfiles()` - Fetch all profiles (admin use)
   - `getCachedFictionalProfile(id)` - Fetch single profile by ID
   - `invalidateFictionalProfilesCache()` - Invalidate all profile caches

2. **API Routes**
   - `GET /api/fictional-profiles` - Fetch profiles with filters (uses cache)
   - `POST /api/fictional-profiles/invalidate` - Invalidate cache (admin only)

3. **Client Integration**
   - Discover page uses cached API route
   - Admin pages invalidate cache on create/update/delete operations

## Usage

### Fetching Cached Profiles

```typescript
// In API routes or server components
import { getCachedFictionalProfiles } from '@/lib/utils/cache'

const profiles = await getCachedFictionalProfiles('female')
```

### Invalidating Cache

```typescript
// After creating, updating, or deleting profiles
import { invalidateFictionalProfilesCache } from '@/lib/utils/cache'

invalidateFictionalProfilesCache()
```

### Client-Side Usage

```typescript
// Fetch from cached API route
const response = await fetch('/api/fictional-profiles?gender=female&minAge=18&maxAge=30')
const { profiles } = await response.json()
```

## Cache Invalidation Triggers

The cache is automatically invalidated when:

1. **Profile Created** - New fictional profile added
2. **Profile Updated** - Existing profile modified
3. **Profile Activated** - Profile `is_active` set to `true`
4. **Profile Deactivated** - Profile `is_active` set to `false`

All admin operations that modify profiles call the invalidation endpoint:

```typescript
await fetch('/api/fictional-profiles/invalidate', { method: 'POST' })
```

## Performance Benefits

### Before Caching
- Every discover page load: Direct database query
- Filter changes: New database query
- Multiple users: N database queries

### After Caching
- First request: Database query + cache storage
- Subsequent requests (within 5 min): Cache hit (no DB query)
- Multiple users: Shared cache (1 DB query serves many users)

### Expected Improvements
- **Response Time**: 50-100ms → 5-10ms (10-20x faster)
- **Database Load**: Reduced by ~90% for profile queries
- **Scalability**: Better handling of concurrent users

## Cache Configuration

```typescript
export const CACHE_CONFIG = {
  FICTIONAL_PROFILES_TTL: 300, // 5 minutes
  FICTIONAL_PROFILES_TAG: 'fictional-profiles',
  FICTIONAL_PROFILES_ALL_TAG: 'fictional-profiles-all',
}
```

## Monitoring

To monitor cache effectiveness:

1. Check response times in browser DevTools
2. Monitor database query logs for reduced profile queries
3. Verify cache invalidation after profile updates

## Future Enhancements

1. **Redis Integration** - For distributed caching across multiple servers
2. **Granular Invalidation** - Invalidate specific gender caches only
3. **Cache Warming** - Pre-populate cache on deployment
4. **Analytics** - Track cache hit/miss rates
5. **Conditional Caching** - Different TTLs based on profile popularity

## Troubleshooting

### Cache Not Updating After Profile Changes

**Problem**: Profile changes not reflected immediately

**Solution**: Ensure cache invalidation is called:
```typescript
await fetch('/api/fictional-profiles/invalidate', { method: 'POST' })
```

### Stale Data Showing

**Problem**: Old data showing despite updates

**Solution**: 
1. Check if invalidation endpoint is being called
2. Verify admin authentication for invalidation
3. Clear Next.js cache: `rm -rf .next/cache`

### Performance Not Improved

**Problem**: No noticeable performance improvement

**Solution**:
1. Verify cache is being used (check API route logs)
2. Ensure TTL is appropriate (5 minutes default)
3. Check if filters are bypassing cache

## Related Files

- `lib/utils/cache.ts` - Cache utility functions
- `app/api/fictional-profiles/route.ts` - Cached API endpoint
- `app/api/fictional-profiles/invalidate/route.ts` - Cache invalidation endpoint
- `app/(real-user)/discover/page.tsx` - Client using cached data
- `app/(admin)/admin/fictional-profiles/page.tsx` - Admin page with invalidation
- `components/admin/FictionalProfileForm.tsx` - Form with invalidation

## Requirements Satisfied

This implementation satisfies **Requirement 29.4**:
- ✅ Cache fictional profiles query results with 5-minute TTL
- ✅ Use Next.js unstable_cache for server-side caching
- ✅ Invalidate cache when profiles are updated
