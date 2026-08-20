export interface AudioData {
  volume: number
  bass: number
  mid: number
  treble: number
  pitch: number
  speechActivity: number
}

export interface AudioAnalyzerOptions {
  fftSize?: number
  smoothingTimeConstant?: number
}

export type AudioAnalyzerErrorCode =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'CONTEXT_SUSPENDED'
  | 'INIT_FAILED'
  | 'UNSUPPORTED'
  | 'DISPOSED'

export const FREQUENCY_BANDS = {
  bass: { minHz: 20, maxHz: 250 },
  mid: { minHz: 250, maxHz: 2000 },
  treble: { minHz: 2000, maxHz: 12000 },
} as const

export const PITCH_RANGE = {
  minHz: 80,
  maxHz: 500,
} as const
