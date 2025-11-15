# Image Optimization Guide

This document describes the image optimization strategy implemented across the Fantooo platform.

## Overview

All images in the application use Next.js Image component with the following optimizations:
- **Lazy loading** for images below the fold
- **Blur placeholders** for better perceived performance
- **Priority loading** for above-the-fold images
- **Responsive sizing** with appropriate `sizes` attribute

## Implementation Details

### 1. Blur Placeholders

We use inline SVG blur placeholders to provide instant visual feedback while images load:

```typescript
import { FICTIONAL_PROFILE_BLUR, DEFAULT_PROFILE_BLUR } from '@/lib/utils/imageOptimization'

// For fictional user profiles
<Image
  placeholder="blur"
  blurDataURL={FICTIONAL_PROFILE_BLUR}
  ...
/>

// For real user profiles
<Image
  placeholder="blur"
  blurDataURL={DEFAULT_PROFILE_BLUR}
  ...
/>
```

### 2. Lazy Loading

Images below the fold use lazy loading to improve initial page load:

```typescript
<Image
  loading="lazy"
  priority={false}
  ...
/>
```

### 3. Priority Loading

Above-the-fold images (first 4 in grids, first image in carousels) use priority loading:

```typescript
<Image
  priority={true}
  loading={undefined}
  ...
/>
```

### 4. Responsive Sizing

All images include appropriate `sizes` attribute for responsive loading:

```typescript
import { imageSizes } from '@/lib/utils/imageOptimization'

// Profile cards in grid
<Image sizes={imageSizes.profileCard} ... />

// Profile detail pages
<Image sizes={imageSizes.profileDetail} ... />

// Avatar images
<Image sizes={imageSizes.avatar} ... />
```

## Components Updated

### Real User Components
- ✅ `ProfileCard.tsx` - Lazy loading + blur placeholder + priority for first 4
- ✅ `ProfileCarousel.tsx` - Priority for first image + blur placeholder
- ✅ `FavoriteCard.tsx` - Lazy loading + blur placeholder
- ✅ `ProfileGrid.tsx` - Priority prop passed to first 4 cards

### Admin Components
- ✅ `FictionalProfileCard.tsx` - Lazy loading + blur placeholder
- ✅ `FictionalProfileForm.tsx` - Lazy loading for images after first 3

### Operator Components
- ✅ `ProfilePanel.tsx` - Blur placeholders + lazy loading for additional images

### Pages
- ✅ `app/(real-user)/me/page.tsx` - Avatar with blur placeholder

## Performance Benefits

1. **Faster Initial Load**: Priority images load first, lazy images load as needed
2. **Better UX**: Blur placeholders prevent layout shift and provide visual feedback
3. **Reduced Bandwidth**: Only visible images are loaded initially
4. **Optimized Delivery**: Next.js automatically serves WebP/AVIF when supported

## Configuration

Image domains are configured in `next.config.js`:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
}
```

## Placeholder Image

A default SVG placeholder is available at `/placeholder-profile.svg` for profiles without images.

## Best Practices

1. **Always use blur placeholders** for better perceived performance
2. **Set priority={true}** only for above-the-fold images (first 4 in grids)
3. **Use appropriate sizes** attribute for responsive images
4. **Lazy load** all images below the fold
5. **Use consistent blur colors** matching the design system

## Testing

To verify optimizations:
1. Check Network tab - images should load progressively
2. Verify blur placeholders appear before images load
3. Confirm lazy images only load when scrolled into view
4. Test on slow 3G to see the benefits

## Future Improvements

- [ ] Implement dynamic blur data URLs from actual image colors
- [ ] Add image preloading for next page in pagination
- [ ] Consider using `loading="eager"` for critical images only
- [ ] Add image quality optimization based on device pixel ratio
