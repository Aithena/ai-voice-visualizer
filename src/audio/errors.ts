import type { AudioAnalyzerErrorCode, AudioData } from './types'

export class AudioAnalyzerError extends Error {
  readonly code: AudioAnalyzerErrorCode

  constructor(code: AudioAnalyzerErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AudioAnalyzerError'
    this.code = code
  }
}

export function createSilentAudioData(): AudioData {
  return {
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    pitch: 0,
    speechActivity: 0,
  }
}

export function writeSilentAudioData(target: AudioData): AudioData {
  target.volume = 0
  target.bass = 0
  target.mid = 0
  target.treble = 0
  target.pitch = 0
  target.speechActivity = 0
  return target
}

export function mapStartError(error: unknown): AudioAnalyzerError {
  if (error instanceof AudioAnalyzerError) {
    return error
  }

  const name = getErrorName(error)
  const message = error instanceof Error ? error.message : 'Audio analyzer failed to start'

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new AudioAnalyzerError('PERMISSION_DENIED', 'Microphone permission was denied', {
      cause: error,
    })
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new AudioAnalyzerError('DEVICE_NOT_FOUND', 'No microphone device was found', {
      cause: error,
    })
  }

  if (name === 'NotSupportedError' || name === 'TypeError') {
    return new AudioAnalyzerError(
      'UNSUPPORTED',
      'Web Audio or microphone capture is not supported in this environment',
      { cause: error },
    )
  }

  return new AudioAnalyzerError('INIT_FAILED', message, { cause: error })
}

function getErrorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    return error.name
  }
  return ''
}
