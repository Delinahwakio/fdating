/**
 * API route for fetching fictional profiles with server-side caching
 * Supports filtering by gender, age range, and location
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCachedFictionalProfiles } from '@/lib/utils/cache'
import { FictionalUser } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gender = searchParams.get('gender') as 'male' | 'female' | null
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    const location = searchParams.get('location')

    // Validate gender parameter
    if (!gender || (gender !== 'male' && gender !== 'female')) {
      return NextResponse.json(
        { error: 'Valid gender parameter (male or female) is required' },
        { status: 400 }
      )
    }

    // Fetch cached profiles by gender
    let profiles = await getCachedFictionalProfiles(gender)

    // Apply additional filters in-memory (since cache is by gender only)
    if (minAge) {
      const minAgeNum = parseInt(minAge, 10)
      if (!isNaN(minAgeNum)) {
        profiles = profiles.filter((p: FictionalUser) => p.age >= minAgeNum)
      }
    }

    if (maxAge) {
      const maxAgeNum = parseInt(maxAge, 10)
      if (!isNaN(maxAgeNum)) {
        profiles = profiles.filter((p: FictionalUser) => p.age <= maxAgeNum)
      }
    }

    if (location) {
      const locationLower = location.toLowerCase()
      profiles = profiles.filter((p: FictionalUser) =>
        p.location.toLowerCase().includes(locationLower)
      )
    }

    return NextResponse.json({ profiles }, { status: 200 })
  } catch (error) {
    console.error('Error fetching fictional profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fictional profiles' },
      { status: 500 }
    )
  }
}
