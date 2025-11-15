# Storage Buckets Setup - Summary

## Overview

Created Supabase Storage infrastructure for managing profile pictures in the Fantooo platform.

## Files Created

### 1. Migration File
**supabase/migrations/008_storage_buckets.sql**
- Creates two public storage buckets with 5MB file size limits
- Implements RLS policies for secure access control
- Adds helper functions for storage management
- Includes automatic cleanup triggers

### 2. Storage Utility Library
**lib/supabase/storage.ts**
- Provides type-safe functions for file uploads
- Handles validation and error handling
- Supports both client and server-side operations
- Includes file conversion utilities

## Storage Buckets

### Real User Profiles Bucket
- **Name**: `real-user-profiles`
- **Public**: Yes (read-only for public)
- **Size Limit**: 5MB per file
- **Allowed Types**: JPEG, JPG, PNG, WebP
- **Structure**: `{user_id}/profile.{ext}`

**Access Control:**
- Real users can upload/update/delete their own pictures
- Public can view all profile pictures
- Automatic cleanup of old pictures on update

### Fictional User Profiles Bucket
- **Name**: `fictional-user-profiles`
- **Public**: Yes (read-only for public)
- **Size Limit**: 5MB per file
- **Allowed Types**: JPEG, JPG, PNG, WebP
- **Structure**: `{fictional_user_id}/{number}.{ext}`

**Access Control:**
- Only admins can upload/update/delete pictures
- Public can view all profile pictures
- Supports multiple pictures per profile

## RLS Policies

### Real User Profiles
1. **Upload**: Users can upload to their own folder
2. **Update**: Users can update their own pictures
3. **Delete**: Users can delete their own pictures
4. **Read**: Public can view all pictures

### Fictional User Profiles
1. **Upload**: Admins only
2. **Update**: Admins only
3. **Delete**: Admins only
4. **Read**: Public can view all pictures

## Helper Functions

### Database Functions (SQL)
- `get_storage_public_url()`: Generates public URLs for storage objects
- `delete_old_profile_picture()`: Automatically cleans up old pictures

### Application Functions (TypeScript)
- `uploadRealUserProfilePicture()`: Upload real user profile picture
- `uploadFictionalUserProfilePictures()`: Upload multiple fictional user pictures
- `deleteRealUserProfilePicture()`: Delete real user profile picture
- `deleteFictionalUserProfilePictures()`: Delete fictional user pictures
- `validateImageFile()`: Validate file size and type
- `fileToBase64()`: Convert file to base64 for preview

## Usage Examples

### Upload Real User Profile Picture

```typescript
import { uploadRealUserProfilePicture } from '@/lib/supabase/storage'

const handleUpload = async (file: File, userId: string) => {
  const { url, error } = await uploadRealUserProfilePicture(userId, file)
  
  if (error) {
    console.error('Upload failed:', error)
    return
  }
  
  // Update user profile with new URL
  await supabase
    .from('real_users')
    .update({ profile_picture: url })
    .eq('id', userId)
}
```

### Upload Fictional User Profile Pictures

```typescript
import { uploadFictionalUserProfilePictures } from '@/lib/supabase/storage'

const handleUpload = async (files: File[], fictionalUserId: string) => {
  const { urls, error } = await uploadFictionalUserProfilePictures(
    fictionalUserId,
    files
  )
  
  if (error) {
    console.error('Upload failed:', error)
    return
  }
  
  // Update fictional user with new URLs
  await supabase
    .from('fictional_users')
    .update({ profile_pictures: urls })
    .eq('id', fictionalUserId)
}
```

### Validate File Before Upload

```typescript
import { validateImageFile } from '@/lib/supabase/storage'

const handleFileSelect = (file: File) => {
  const validation = validateImageFile(file)
  
  if (!validation.valid) {
    alert(validation.error)
    return
  }
  
  // Proceed with upload
}
```

## File Validation

### Size Limits
- Maximum file size: 5MB
- Enforced at both application and database level

### Allowed Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Validation Rules
1. File size must be ≤ 5MB
2. MIME type must be in allowed list
3. File extension must match MIME type

## Security Features

### Row Level Security
- All storage operations go through RLS policies
- Users can only access their own files
- Admins have full access to fictional user files
- Public read-only access for discovery

### Automatic Cleanup
- Old profile pictures are automatically deleted when updated
- Prevents storage bloat
- Maintains data consistency

### Input Validation
- File size validation
- MIME type validation
- Path sanitization
- User authentication checks

## Storage Structure

```
real-user-profiles/
├── {user_id_1}/
│   └── profile.jpg
├── {user_id_2}/
│   └── profile.png
└── {user_id_3}/
    └── profile.webp

fictional-user-profiles/
├── {fictional_id_1}/
│   ├── 1.jpg
│   ├── 2.jpg
│   └── 3.jpg
├── {fictional_id_2}/
│   ├── 1.png
│   └── 2.png
└── {fictional_id_3}/
    └── 1.webp
```

## Migration Instructions

### Run Migration

**Using Supabase Dashboard:**
1. Go to SQL Editor
2. Copy content from `008_storage_buckets.sql`
3. Run the migration
4. Verify buckets created in Storage section

**Using Supabase CLI:**
```bash
supabase db push
```

### Verify Setup

```sql
-- Check buckets exist
SELECT * FROM storage.buckets 
WHERE id IN ('real-user-profiles', 'fictional-user-profiles');

-- Check policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Test upload (as authenticated user)
-- Use Supabase Dashboard → Storage → Upload
```

## Post-Migration Tasks

1. **Test Uploads**
   - Test real user profile picture upload
   - Test fictional user profile pictures upload
   - Verify public access works

2. **Update Application Code**
   - Import storage utilities where needed
   - Replace placeholder image URLs
   - Add file upload UI components

3. **Configure CDN (Optional)**
   - Set up Cloudflare or similar CDN
   - Configure caching headers
   - Optimize image delivery

## Performance Considerations

### Caching
- Public URLs are cached for 1 hour
- Browser caching reduces server load
- CDN can further improve performance

### Optimization
- Consider image compression before upload
- Use WebP format for better compression
- Implement lazy loading for images
- Generate thumbnails for list views

### Monitoring
- Track storage usage in Supabase Dashboard
- Monitor upload success/failure rates
- Set up alerts for storage quota

## Troubleshooting

### Upload Fails
- Check file size (must be ≤ 5MB)
- Verify file type is allowed
- Ensure user is authenticated
- Check RLS policies are active

### Images Not Loading
- Verify bucket is public
- Check public URL format
- Ensure CORS is configured
- Verify file exists in storage

### Permission Denied
- Check user authentication
- Verify RLS policies
- Ensure correct bucket name
- Check user role (admin for fictional users)

## Future Enhancements

1. **Image Processing**
   - Automatic thumbnail generation
   - Image compression
   - Format conversion
   - Watermarking

2. **Advanced Features**
   - Multiple profile pictures for real users
   - Image cropping/editing
   - Bulk upload for admins
   - Image moderation

3. **Performance**
   - CDN integration
   - Image optimization pipeline
   - Progressive image loading
   - Responsive images

## Documentation Updated

- ✅ Migration guide updated with new migration
- ✅ README updated with storage bucket info
- ✅ Storage utility library created
- ✅ Usage examples provided
- ✅ Security policies documented
