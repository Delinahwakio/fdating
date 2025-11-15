/**
 * Tests for cache utility functions
 * Note: These tests verify the cache function structure and exports
 */

import { describe, it, expect } from 'vitest'
import { CACHE_CONFIG } from '../cache'

describe('Cache Utility', () => {
  describe('CACHE_CONFIG', () => {
    it('should have correct TTL value', () => {
      expect(CACHE_CONFIG.FICTIONAL_PROFILES_TTL).toBe(300)
    })

    it('should have correct cache tags', () => {
      expect(CACHE_CONFIG.FICTIONAL_PROFILES_TAG).toBe('fictional-profiles')
      expect(CACHE_CONFIG.FICTIONAL_PROFILES_ALL_TAG).toBe('fictional-profiles-all')
    })
  })

  describe('Cache Functions', () => {
    it('should export getCachedFictionalProfiles function', async () => {
      const { getCachedFictionalProfiles } = await import('../cache')
      expect(typeof getCachedFictionalProfiles).toBe('function')
    })

    it('should export getCachedAllFictionalProfiles function', async () => {
      const { getCachedAllFictionalProfiles } = await import('../cache')
      expect(typeof getCachedAllFictionalProfiles).toBe('function')
    })

    it('should export getCachedFictionalProfile function', async () => {
      const { getCachedFictionalProfile } = await import('../cache')
      expect(typeof getCachedFictionalProfile).toBe('function')
    })

    it('should export invalidateFictionalProfilesCache function', async () => {
      const { invalidateFictionalProfilesCache } = await import('../cache')
      expect(typeof invalidateFictionalProfilesCache).toBe('function')
    })
  })
})
