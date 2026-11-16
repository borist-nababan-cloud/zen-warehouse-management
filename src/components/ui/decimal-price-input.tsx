import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Format numeric price into Indonesian Rupiah decimal format (#.#,#0 -> e.g. 12.500,00)
 */
export const formatDecimalId = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0,00'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

/**
 * Format live typing string with automatic '.' thousand separators and ',' decimal separator (max 2 decimals)
 */
export const sanitizeAndFormatLiveDecimalId = (rawInput: string): { display: string; numeric: number } => {
  if (!rawInput) return { display: '', numeric: 0 }

  // Keep only digits and ',' (thousand '.' are stripped and re-computed automatically)
  const cleaned = rawInput.replace(/[^\d,]/g, '')
  if (!cleaned) return { display: '', numeric: 0 }

  const commaIndex = cleaned.indexOf(',')
  let intRaw = commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned
  // Strip any extra commas in the fractional part and cap at 2 decimal places
  const decRaw = commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2) : ''

  // Normalize leading zeros on integer part
  intRaw = intRaw.replace(/^0+(?=\d)/, '')
  if (intRaw === '' && commaIndex >= 0) {
    intRaw = '0'
  }

  const intNumber = intRaw ? parseInt(intRaw, 10) : 0
  const formattedInt = intRaw ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(intNumber) : ''

  const display = commaIndex >= 0 ? `${formattedInt},${decRaw}` : formattedInt
  const numericStr = commaIndex >= 0 ? `${intNumber}.${decRaw || '0'}` : `${intNumber}`
  const parsed = parseFloat(numericStr)
  const numeric = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100

  return { display, numeric }
}

export interface DecimalPriceInputProps {
  value: number
  onChange: (newValue: number) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

/**
 * Indonesian Rupiah decimal input (#.#,#0) supporting both ',' and '.' / NumpadDecimal keys.
 */
export function DecimalPriceInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = '0,00',
}: DecimalPriceInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [localDisplay, setLocalDisplay] = useState<string>(() => formatDecimalId(value))

  // When not focused, always reflect the canonical 2-decimal formatted prop value (#.#,#0)
  const displayedValue = isFocused ? localDisplay : formatDecimalId(value)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    const hasDecimals = Math.round((value % 1) * 100) !== 0
    if (value === 0) {
      setLocalDisplay('')
    } else if (hasDecimals) {
      setLocalDisplay(formatDecimalId(value))
    } else {
      setLocalDisplay(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value))
    }
    requestAnimationFrame(() => {
      e.target.select()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow user to press "." on main keyboard or NumpadDecimal to insert Indonesian decimal comma ","
    if (e.key === '.' || e.code === 'NumpadDecimal') {
      e.preventDefault()
      const input = e.currentTarget
      const start = input.selectionStart ?? localDisplay.length
      const end = input.selectionEnd ?? localDisplay.length
      const currentWithoutSelection = localDisplay.slice(0, start) + localDisplay.slice(end)

      if (!currentWithoutSelection.includes(',')) {
        const nextRaw = localDisplay.slice(0, start) + ',' + localDisplay.slice(end)
        const { display, numeric } = sanitizeAndFormatLiveDecimalId(nextRaw)
        setLocalDisplay(display)
        onChange(numeric)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value

    // Fallback for mobile virtual keyboards where Numpad "." comes through onChange instead of onKeyDown
    const prevDotCount = (localDisplay.match(/\./g) || []).length
    const currDotCount = (raw.match(/\./g) || []).length
    if (currDotCount > prevDotCount && !raw.includes(',')) {
      const lastDotIdx = raw.lastIndexOf('.')
      raw = raw.slice(0, lastDotIdx) + ',' + raw.slice(lastDotIdx + 1)
    }

    const { display, numeric } = sanitizeAndFormatLiveDecimalId(raw)
    setLocalDisplay(display)
    onChange(numeric)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const rounded = Math.round((value || 0) * 100) / 100
    setLocalDisplay(formatDecimalId(rounded))
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayedValue}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(
        'h-9 w-full text-right font-mono text-sm',
        disabled && 'bg-muted cursor-not-allowed',
        className
      )}
      placeholder={placeholder}
    />
  )
}
