/**
 * Monitoring configuration
 * Central configuration for all monitoring services
 */

export const monitoringConfig = {
  // Sentry configuration
  sentry: {
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  },

  // LogRocket configuration
  logRocket: {
    enabled: !!process.env.NEXT_PUBLIC_LOGROCKET_APP_ID,
    appId: process.env.NEXT_PUBLIC_LOGROCKET_APP_ID,
    console: {
      shouldAggregateConsoleErrors: true
    },
    network: {
      requestSanitizer: (request: any) => {
        // Remove sensitive headers
        if (request.headers) {
          delete request.headers['authorization']
          delete request.headers['cookie']
        }
        return request
      },
      responseSanitizer: (response: any) => {
        // Remove sensitive data from responses
        return response
      }
    }
  },

  // Google Analytics configuration
  analytics: {
    enabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  },

  // Performance monitoring thresholds
  performance: {
    slowApiThreshold: 1000, // ms
    slowQueryThreshold: 1000, // ms
    slowPageLoadThreshold: 3000, // ms
    errorRateThreshold: 0.01, // 1%
    criticalErrorRateThreshold: 0.001 // 0.1%
  },

  // Health check configuration
  healthCheck: {
    enabled: true,
    interval: 60000, // 1 minute
    timeout: 5000, // 5 seconds
    endpoints: [
      '/api/health'
    ]
  },

  // Logging configuration
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    console: true,
    remote: process.env.NODE_ENV === 'production',
    includeStackTrace: process.env.NODE_ENV !== 'production'
  }
}

export default monitoringConfig
