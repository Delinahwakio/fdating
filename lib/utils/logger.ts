/**
 * Centralized logging utility for the Fantooo platform
 * Provides structured logging with different severity levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogContext {
  userId?: string
  operatorId?: string
  adminId?: string
  chatId?: string
  requestId?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
  environment: string
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: process.env.NODE_ENV || 'development'
    }

    if (context) {
      entry.context = context
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack
      }
    }

    return entry
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨'
    }

    const parts = [
      emoji[entry.level],
      `[${entry.level.toUpperCase()}]`,
      entry.message
    ]

    if (entry.context) {
      parts.push(JSON.stringify(entry.context, null, 2))
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`)
      if (entry.error.stack) {
        parts.push(entry.error.stack)
      }
    }

    return parts.join(' ')
  }

  /**
   * Send log to external monitoring service
   */
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    // Only send errors and critical logs to monitoring in production
    if (!this.isProduction || (entry.level !== 'error' && entry.level !== 'critical')) {
      return
    }

    try {
      // Send to Sentry if configured
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        const Sentry = (window as any).Sentry
        
        if (entry.error) {
          Sentry.captureException(new Error(entry.message), {
            level: entry.level === 'critical' ? 'fatal' : 'error',
            contexts: {
              custom: entry.context
            }
          })
        } else {
          Sentry.captureMessage(entry.message, {
            level: entry.level === 'critical' ? 'fatal' : 'error',
            contexts: {
              custom: entry.context
            }
          })
        }
      }

      // Send to LogRocket if configured
      if (typeof window !== 'undefined' && (window as any).LogRocket) {
        const LogRocket = (window as any).LogRocket
        LogRocket.error(entry.message, entry)
      }

      // Send to custom logging endpoint
      if (this.isProduction) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        }).catch(() => {
          // Silently fail if logging endpoint is unavailable
        })
      }
    } catch (error) {
      // Don't throw errors from logging
      console.error('Failed to send log to monitoring:', error)
    }
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return

    const entry = this.createLogEntry('debug', message, context)
    console.debug(this.formatForConsole(entry))
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context)
    console.info(this.formatForConsole(entry))
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context)
    console.warn(this.formatForConsole(entry))
    this.sendToMonitoring(entry)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('error', message, context, error)
    console.error(this.formatForConsole(entry))
    this.sendToMonitoring(entry)
  }

  /**
   * Log a critical error that requires immediate attention
   */
  critical(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('critical', message, context, error)
    console.error(this.formatForConsole(entry))
    this.sendToMonitoring(entry)
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${path}`, context)
  }

  /**
   * Log API response
   */
  apiResponse(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    const message = `API Response: ${method} ${path} - ${status} (${duration}ms)`
    
    if (level === 'error') {
      this.error(message, undefined, context)
    } else if (level === 'warn') {
      this.warn(message, context)
    } else {
      this.info(message, context)
    }
  }

  /**
   * Log database query
   */
  dbQuery(query: string, duration: number, context?: LogContext): void {
    if (duration > 1000) {
      this.warn(`Slow query detected (${duration}ms)`, { ...context, query })
    } else if (this.isDevelopment) {
      this.debug(`DB Query (${duration}ms)`, { ...context, query })
    }
  }

  /**
   * Log authentication event
   */
  auth(event: string, userId?: string, success: boolean = true): void {
    const level = success ? 'info' : 'warn'
    const message = `Auth: ${event} - ${success ? 'Success' : 'Failed'}`
    
    if (level === 'warn') {
      this.warn(message, { userId, event })
    } else {
      this.info(message, { userId, event })
    }
  }

  /**
   * Log payment event
   */
  payment(event: string, amount: number, userId: string, success: boolean = true): void {
    const level = success ? 'info' : 'error'
    const message = `Payment: ${event} - ${success ? 'Success' : 'Failed'} - KES ${amount}`
    
    if (level === 'error') {
      this.error(message, undefined, { userId, amount, event })
    } else {
      this.info(message, { userId, amount, event })
    }
  }

  /**
   * Log operator activity
   */
  operator(event: string, operatorId: string, chatId?: string): void {
    this.info(`Operator: ${event}`, { operatorId, chatId, event })
  }

  /**
   * Log admin action
   */
  admin(action: string, adminId: string, targetId?: string): void {
    this.info(`Admin: ${action}`, { adminId, targetId, action })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }
