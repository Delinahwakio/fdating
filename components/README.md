# Fantooo UI Components

This directory contains all reusable UI components for the Fantooo platform, built with glassmorphism design principles.

## Shared Components

### Base Glass Components

#### GlassCard
A card component with glassmorphism effects (backdrop blur and transparency).

```tsx
import { GlassCard } from '@/components/shared'

<GlassCard className="p-6">
  <h2>Card Title</h2>
  <p>Card content</p>
</GlassCard>
```

#### GlassButton
A button component with three variants and hover effects.

```tsx
import { GlassButton } from '@/components/shared'

<GlassButton variant="primary" size="md" onClick={handleClick}>
  Click Me
</GlassButton>

// Variants: 'primary' | 'secondary' | 'ghost'
// Sizes: 'sm' | 'md' | 'lg'
```

#### GlassInput
An input component with focus states and error handling.

```tsx
import { GlassInput } from '@/components/shared'

<GlassInput
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
  helperText="We'll never share your email"
/>
```

### Utility Components

#### Modal
A modal component with overlay and animations.

```tsx
import { Modal } from '@/components/shared'

<Modal isOpen={isOpen} onClose={handleClose}>
  <GlassCard className="p-6">
    <h2>Modal Title</h2>
    <p>Modal content</p>
  </GlassCard>
</Modal>
```

#### Toast
A toast notification system with success/error/info variants.

```tsx
// Wrap your app with ToastProvider
import { ToastProvider } from '@/components/shared'

<ToastProvider>
  <App />
</ToastProvider>

// Use in components
import { useToast } from '@/components/shared'

const { success, error, info } = useToast()

success('Operation completed!')
error('Something went wrong')
info('Here is some information')
```

#### LoadingSpinner
A loading spinner component with different sizes.

```tsx
import { LoadingSpinner, LoadingScreen } from '@/components/shared'

// Inline spinner
<LoadingSpinner size="md" />

// Full screen loading
<LoadingScreen message="Loading your data..." />
```

## Layout Components

### AuthLayout
Layout for public authentication pages (login, register).

```tsx
import { AuthLayout } from '@/components/layouts'

<AuthLayout>
  <LoginForm />
</AuthLayout>
```

### DashboardLayout
Layout for real user pages with navigation.

```tsx
import { DashboardLayout } from '@/components/layouts'

<DashboardLayout>
  <YourPageContent />
</DashboardLayout>
```

### OperatorLayout
Layout for operator interface.

```tsx
import { OperatorLayout } from '@/components/layouts'

<OperatorLayout>
  <OperatorContent />
</OperatorLayout>
```

### AdminLayout
Layout for admin panel with sidebar navigation.

```tsx
import { AdminLayout } from '@/components/layouts'

<AdminLayout>
  <AdminContent />
</AdminLayout>
```

## Design System

### Colors
- Primary Background: `#0F0F23` (bg-primary-bg)
- Secondary Background: `#1A1A2E` (bg-primary-secondary)
- Primary Red: `#DC2626` (bg-primary-red)
- Glass Light: `rgba(255, 255, 255, 0.1)` (bg-glass-light)
- Glass Medium: `rgba(255, 255, 255, 0.05)` (bg-glass-medium)

### Border Radius
- Glass: `16px` (rounded-glass)
- Glass Small: `8px` (rounded-glass-sm)

### Typography
- Primary Text: `#F9FAFB` (text-gray-50)
- Secondary Text: `#D1D5DB` (text-gray-300)
- Tertiary Text: `#9CA3AF` (text-gray-400)

## Utilities

### cn() Function
A utility function for merging Tailwind classes.

```tsx
import { cn } from '@/lib/utils/cn'

<div className={cn('base-class', condition && 'conditional-class', className)} />
```
