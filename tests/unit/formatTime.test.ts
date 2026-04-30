import { describe, expect, it } from 'vitest'
import { formatTime } from '../../src/demo/utils/formatTime'

describe('formatTime', () => {
  it('formats whole minutes', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(120)).toBe('02:00')
  })

  it('formats minutes + seconds', () => {
    expect(formatTime(107)).toBe('01:47') // DHYH ad-break clip-time
    expect(formatTime(602)).toBe('10:02') // DHYH total clip duration
  })

  it('floors fractional seconds', () => {
    expect(formatTime(59.9)).toBe('00:59')
    expect(formatTime(60.999)).toBe('01:00')
  })

  it('clamps negative input to 00:00', () => {
    expect(formatTime(-1)).toBe('00:00')
    expect(formatTime(-1000)).toBe('00:00')
  })

  it('zero-pads single-digit minutes and seconds', () => {
    expect(formatTime(5)).toBe('00:05')
    expect(formatTime(65)).toBe('01:05')
  })
})
