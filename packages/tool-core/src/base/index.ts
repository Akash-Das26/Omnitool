export const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class BaseConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseConversionError';
  }
}

function assertBase(base: number): void {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new BaseConversionError('Bases must be whole numbers between 2 and 36');
  }
}

function validDigitRange(base: number): string {
  return base <= 10 ? `0-${base - 1}` : `0-9 and A-${DIGITS.charAt(base - 1)}`;
}

export function parseInBase(value: string, base: number): bigint {
  assertBase(base);
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new BaseConversionError('Enter a value to convert');
  }
  if (trimmed.includes('.')) {
    throw new BaseConversionError('Only whole numbers can be converted exactly');
  }

  let sign = 1n;
  let digits = trimmed;
  if (digits.startsWith('-') || digits.startsWith('+')) {
    sign = digits.startsWith('-') ? -1n : 1n;
    digits = digits.slice(1);
  }
  if (digits === '') {
    throw new BaseConversionError('Enter digits after the sign');
  }

  const bigBase = BigInt(base);
  let result = 0n;
  for (const character of Array.from(digits)) {
    const digit = DIGITS.indexOf(character.toUpperCase());
    if (digit < 0 || digit >= base) {
      throw new BaseConversionError(
        `"${character}" is not a valid digit in base ${base} (use ${validDigitRange(base)})`,
      );
    }
    result = result * bigBase + BigInt(digit);
  }
  return sign * result;
}

export function formatInBase(value: bigint, base: number): string {
  assertBase(base);
  if (value === 0n) return '0';

  const negative = value < 0n;
  let remaining = negative ? -value : value;
  const bigBase = BigInt(base);
  let output = '';
  while (remaining > 0n) {
    const digit = Number(remaining % bigBase);
    output = DIGITS.charAt(digit) + output;
    remaining /= bigBase;
  }
  return negative ? `-${output}` : output;
}

export function convertBase(value: string, fromBase: number, toBase: number): string {
  return formatInBase(parseInBase(value, fromBase), toBase);
}
