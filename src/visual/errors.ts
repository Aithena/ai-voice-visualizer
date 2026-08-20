import type { VisualEngineErrorCode } from './types'

export class VisualEngineError extends Error {
  readonly code: VisualEngineErrorCode

  constructor(code: VisualEngineErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'VisualEngineError'
    this.code = code
  }
}
