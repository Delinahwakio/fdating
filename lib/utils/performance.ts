/**
 * Performance monitoring utilities
 * Track and report performance metrics
 */

import { logger } from './logger'

export interface PerformanceMetric {
  name: string
  duration: number
  timestamp: string
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()

  /**
   * Start timing an operation
   */
  start(operationName: string): void {
    this.metrics.set(operationName, Date.now())
  }

  /**
   * End timing an operation and log the duration
   */
  end(operationName: string, metadata?: Record<string, any>): number {
    const startTime = this.metrics.get(operationName)
    
    if (!startTime) {
      logger.warn(`Performance metric "${operationName}" was never started`)
      return 0
    }

    const duration = Date.now() - startTime
    this.metrics.delete(operationName)

    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operationName} took ${duration}ms`, metadata)
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug(`${operationName} completed in ${duration}ms`, metadata)
    }

    return duration
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operationName)
    try {
      const result = await operation()
      this.end(operationName, metadata)
      return result
    } catch (error) {
      this.end(operationName, { ...metadata, error: true })
      throw error
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    this.start(operationName)
    try {
      const result = operation()
      this.end(operationName, metadata)
      return result
    } catch (error) {
      this.end(operationName, { ...metadata, error: true })
      throw error
    }
  }

  /**
   * Report Web Vitals (client-side only)
   */
  reportWebVitals(metric: any): void {
    if (typeof window === 'undefined') return

    const { name, value, id } = metric

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vital] ${name}:`, value)
    }

    // Send to analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', name, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        event_category: 'Web Vitals',
        event_label: id,
        non_interaction: true
      })
    }

    // Send to custom endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, id })
      }).catch(() => {
        // Silently fail
      })
    }
  }
}

// Export singleton instance
export const performance = new PerformanceMonitor()

// Export for testing
export { PerformanceMonitor }
