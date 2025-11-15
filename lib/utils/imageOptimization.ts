/**
 * Image optimization utilities for Next.js Image component
 */

/**
 * Generate a simple blur data URL for placeholder
 * This creates a tiny 10x10 pixel gradient that can be used as a blur placeholder
 */
export const generateBlurDataURL = (color: string = '#1A1A2E'): string => {
  // Create a simple SVG blur placeholder
  const svg = `
    <svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
        </linearGradient>
      </defs>
      <rect width="10" height="10" fill="url(#grad)" />
    </svg>
  `
  
  // Convert SVG to base64 data URL
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Default blur placeholder for profile images
 */
export const DEFAULT_PROFILE_BLUR = generateBlurDataURL('#1A1A2E')

/**
 * Blur placeholder with a slight purple tint for fictional profiles
 */
export const FICTIONAL_PROFILE_BLUR = generateBlurDataURL('#2D1B4E')

/**
 * Image loader configuration for optimized loading
 */
export const imageLoaderConfig = {
  // For images in viewport on initial load
  priority: {
    loading: undefined as 'lazy' | 'eager' | undefined,
    priority: true,
  },
  // For images below the fold
  lazy: {
    loading: 'lazy' as const,
    priority: false,
  },
} as const

/**
 * Common sizes for responsive images
 */
export const imageSizes = {
  profileCard: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  profileDetail: '(max-width: 768px) 100vw, 50vw',
  avatar: '128px',
  thumbnail: '200px',
  fullWidth: '100vw',
} as const
