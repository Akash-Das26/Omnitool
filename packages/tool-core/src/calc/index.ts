/**
 * A small scientific calculator: own tokenizer, own recursive-descent parser,
 * own evaluator. No `eval`, no `Function`, no third-party maths library.
 *
 * Grammar (lowest binding first):
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/' | '%') unary)*
 *   unary      := ('+' | '-') unary | power
 *   power      := postfix ('^' unary)?          right-associative
 *   postfix    := primary '!'*
 *   primary    := number | name | name '(' expression ')' | '(' expression ')'
 *
 * Multiplication is explicit only: `2(3+4)` and `2pi` are rejected with a
 * message that says what to type instead (DEC-39). `%` is the remainder, not a
 * percentage.
 */

export type AngleMode = 'deg' | 'rad' | 'grad';

export interface CalcOptions {
  readonly angleMode?: AngleMode;
  /** Display precision, 1 to 15 significant digits. Defaults to 12. */
  readonly significantDigits?: number;
  /** The previous result, available as `ans`. Defaults to 0. */
  readonly ans?: number;
}

export type CalcResult =
  | { readonly ok: true; readonly value: number; readonly display: string }
  | { readonly ok: false; readonly error: string };

/** Values for the names a compiled expression may read, such as `x` when plotting. */
export type CalcScope = Readonly<Record<string, number>>;

/**
 * A parsed expression, ready to be evaluated many times. The graph tool needs
 * one parse and thousands of evaluations per frame; the calculator needs one of
 * each, and both go through `compileExpression`.
 */
export interface CompiledExpression {
  readonly evaluate: (scope?: CalcScope) => number;
}

export type CompileResult =
  | { readonly ok: true; readonly compiled: CompiledExpression }
  | { readonly ok: false; readonly error: string };

export interface CompileOptions extends CalcOptions {
  /**
   * Names that are allowed but resolved at evaluation time. A name that is not
   * listed here, and is not `pi`, `e`, `ans` or a function, is an error when the
   * expression is compiled, exactly as before graphing existed.
   */
  readonly variables?: readonly string[];
}

const MAX_LENGTH = 1000;
const MAX_DEPTH = 100;
const MAX_FACTORIAL = 170;
const DEFAULT_DIGITS = 12;

class CalcError extends Error {}

type Token =
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'name'; readonly value: string }
  | { readonly type: 'op'; readonly value: '+' | '-' | '*' | '/' | '^' | '%' }
  | { readonly type: 'open' }
  | { readonly type: 'close' }
  | { readonly type: 'bang' };

const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const NAME = /^[A-Za-z][A-Za-z0-9]*/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const rest = input.slice(index);
    const char = input[index] as string;

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const number = NUMBER.exec(rest);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new CalcError('That number is too large to show.');
      tokens.push({ type: 'number', value });
      index += number[0].length;
      continue;
    }

    const name = NAME.exec(rest);
    if (name) {
      tokens.push({ type: 'name', value: name[0].toLowerCase() });
      index += name[0].length;
      continue;
    }

    if (
      char === '+' ||
      char === '-' ||
      char === '*' ||
      char === '/' ||
      char === '^' ||
      char === '%'
    ) {
      tokens.push({ type: 'op', value: char });
      index += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'open' });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'close' });
      index += 1;
      continue;
    }
    if (char === '!') {
      tokens.push({ type: 'bang' });
      index += 1;
      continue;
    }

    throw new CalcError(`Unexpected character “${char}”.`);
  }

  return tokens;
}

function toRadians(value: number, mode: AngleMode): number {
  if (mode === 'deg') return (value * Math.PI) / 180;
  if (mode === 'grad') return (value * Math.PI) / 200;
  return value;
}

function fromRadians(value: number, mode: AngleMode): number {
  if (mode === 'deg') return (value * 180) / Math.PI;
  if (mode === 'grad') return (value * 200) / Math.PI;
  return value;
}

function factorial(value: number): number {
  if (!Number.isInteger(value)) throw new CalcError('Factorial needs a whole number.');
  if (value < 0 || value > MAX_FACTORIAL) {
    throw new CalcError(`Factorial needs a whole number from 0 to ${MAX_FACTORIAL}.`);
  }
  let total = 1;
  for (let factor = 2; factor <= value; factor += 1) total *= factor;
  return total;
}

function applyFunction(name: string, value: number, mode: AngleMode): number {
  switch (name) {
    case 'sin':
      return Math.sin(toRadians(value, mode));
    case 'cos':
      return Math.cos(toRadians(value, mode));
    case 'tan':
      return Math.tan(toRadians(value, mode));
    case 'asin':
      if (value < -1 || value > 1) {
        throw new CalcError('The inverse sine is only defined between -1 and 1.');
      }
      return fromRadians(Math.asin(value), mode);
    case 'acos':
      if (value < -1 || value > 1) {
        throw new CalcError('The inverse cosine is only defined between -1 and 1.');
      }
      return fromRadians(Math.acos(value), mode);
    case 'atan':
      return fromRadians(Math.atan(value), mode);
    case 'sinh':
      return Math.sinh(value);
    case 'cosh':
      return Math.cosh(value);
    case 'tanh':
      return Math.tanh(value);
    case 'ln':
      if (value <= 0) throw new CalcError('The logarithm is only defined for numbers above zero.');
      return Math.log(value);
    case 'log':
      if (value <= 0) throw new CalcError('The logarithm is only defined for numbers above zero.');
      return Math.log10(value);
    case 'log2':
      if (value <= 0) throw new CalcError('The logarithm is only defined for numbers above zero.');
      return Math.log2(value);
    case 'sqrt':
      if (value < 0) {
        throw new CalcError('The square root of a negative number is not a real number.');
      }
      return Math.sqrt(value);
    case 'cbrt':
      return Math.cbrt(value);
    case 'abs':
      return Math.abs(value);
    case 'exp':
      return Math.exp(value);
    case 'floor':
      return Math.floor(value);
    case 'ceil':
      return Math.ceil(value);
    case 'round':
      return Math.round(value);
    default:
      throw new CalcError(`Unknown name “${name}”.`);
  }
}

const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'ln',
  'log',
  'log2',
  'sqrt',
  'cbrt',
  'abs',
  'exp',
  'floor',
  'ceil',
  'round',
]);

/** A node that can be evaluated against a scope; numbers are constant closures. */
type Eval = (scope: CalcScope) => number;

const constant =
  (value: number): Eval =>
  () =>
    value;

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly mode: AngleMode,
    private readonly ans: number,
    private readonly variables: ReadonlySet<string>,
  ) {}

  parse(): Eval {
    const value = this.expression(0);
    const token = this.tokens[this.index];
    if (token) throw new CalcError(this.leftoverMessage(token));
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private expression(depth: number): Eval {
    let value = this.term(depth);
    for (;;) {
      const token = this.peek();
      if (token?.type !== 'op' || (token.value !== '+' && token.value !== '-')) return value;
      this.index += 1;
      const right = this.term(depth);
      const left = value;
      value =
        token.value === '+'
          ? (scope) => left(scope) + right(scope)
          : (scope) => left(scope) - right(scope);
    }
  }

  private term(depth: number): Eval {
    let value = this.unary(depth);
    for (;;) {
      const token = this.peek();
      if (
        token?.type !== 'op' ||
        (token.value !== '*' && token.value !== '/' && token.value !== '%')
      ) {
        return value;
      }
      this.index += 1;
      const right = this.unary(depth);
      const left = value;
      if (token.value === '*') {
        value = (scope) => left(scope) * right(scope);
      } else if (token.value === '/') {
        value = (scope) => {
          const divisor = right(scope);
          if (divisor === 0) throw new CalcError('Division by zero has no value.');
          return left(scope) / divisor;
        };
      } else {
        value = (scope) => {
          const divisor = right(scope);
          if (divisor === 0)
            throw new CalcError('The remainder after dividing by zero has no value.');
          return left(scope) % divisor;
        };
      }
    }
  }

  private unary(depth: number): Eval {
    const token = this.peek();
    if (token?.type === 'op' && (token.value === '-' || token.value === '+')) {
      this.index += 1;
      const value = this.unary(depth);
      return token.value === '-' ? (scope) => -value(scope) : value;
    }
    return this.power(depth);
  }

  private power(depth: number): Eval {
    const base = this.postfix(depth);
    const token = this.peek();
    if (token?.type === 'op' && token.value === '^') {
      this.index += 1;
      // Right-associative, and the exponent may carry its own sign: 2^-3.
      const exponent = this.unary(depth);
      return (scope) => base(scope) ** exponent(scope);
    }
    return base;
  }

  private postfix(depth: number): Eval {
    let value = this.primary(depth);
    while (this.peek()?.type === 'bang') {
      this.index += 1;
      const inner = value;
      value = (scope) => factorial(inner(scope));
    }
    return value;
  }

  private primary(depth: number): Eval {
    const token = this.peek();
    if (!token) throw new CalcError('The expression is incomplete.');

    if (token.type === 'number') {
      this.index += 1;
      return constant(token.value);
    }

    if (token.type === 'name') {
      this.index += 1;
      const next = this.peek();
      if (next?.type === 'open') {
        if (!FUNCTIONS.has(token.value)) {
          throw new CalcError(`Unknown function “${token.value}”.`);
        }
        this.index += 1;
        const argument = this.bracket(depth + 1);
        const name = token.value;
        return (scope) => applyFunction(name, argument(scope), this.mode);
      }
      if (token.value === 'pi') return constant(Math.PI);
      if (token.value === 'e') return constant(Math.E);
      if (token.value === 'ans') return constant(this.ans);
      if (this.variables.has(token.value)) {
        const name = token.value;
        return (scope) => {
          const value = scope[name];
          if (value === undefined) throw new CalcError(`“${name}” has no value here.`);
          return value;
        };
      }
      if (FUNCTIONS.has(token.value)) {
        throw new CalcError(`“${token.value}” needs a value in brackets.`);
      }
      throw new CalcError(`Unknown name “${token.value}”.`);
    }

    if (token.type === 'open') {
      this.index += 1;
      return this.bracket(depth + 1);
    }

    if (token.type === 'close') throw new CalcError('A value is missing before “)”.');
    if (token.type === 'bang') throw new CalcError('A value is missing before “!”.');

    throw new CalcError(`A value is missing before “${token.value}”.`);
  }

  /** Reads up to and including the closing bracket of an already-consumed “(”. */
  private bracket(depth: number): Eval {
    if (depth > MAX_DEPTH) {
      throw new CalcError(`The expression is nested more than ${MAX_DEPTH} levels deep.`);
    }
    const value = this.expression(depth);
    const token = this.peek();
    if (token?.type !== 'close') throw new CalcError('A bracket is not closed.');
    this.index += 1;
    return value;
  }

  private leftoverMessage(token: Token): string {
    if (token.type === 'close') return 'There is a closing bracket without an opening one.';
    if (token.type === 'open') return 'Use * before a bracket.';
    if (token.type === 'number' || token.type === 'name') return 'Use * between values.';
    if (token.type === 'bang') return 'A value is missing before “!”.';
    return `Something is left over after the expression: “${token.value}”.`;
  }
}

function exponentText(exponent: string): string {
  const sign = exponent.startsWith('-') ? '-' : '+';
  const digits = exponent.replace(/^[+-]/, '').replace(/^0+(?=\d)/, '');
  return `e${sign}${digits}`;
}

/**
 * Rounds to `significantDigits` significant digits and switches to scientific
 * notation beyond 1e12 or below 1e-4. Trailing zeros are dropped, so 0.1 + 0.2
 * shows as 0.3 rather than 0.30000000000000004.
 */
export function formatNumber(value: number, significantDigits = DEFAULT_DIGITS): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';

  const digits = Math.min(15, Math.max(1, Math.trunc(significantDigits)));
  const magnitude = Math.abs(value);

  if (magnitude >= 1e12 || magnitude < 1e-4) {
    const [mantissa, exponent] = value.toExponential(digits - 1).split('e');
    const trimmed = (mantissa as string).replace(/0+$/, '').replace(/\.$/, '');
    return `${trimmed}${exponentText(exponent as string)}`;
  }

  const decimals = digits - 1 - Math.floor(Math.log10(magnitude));
  if (decimals < 0) {
    // Fewer significant digits than integer places: round the integer part.
    const step = 10 ** -decimals;
    return String(Math.round(value / step) * step);
  }

  const fixed = value.toFixed(Math.min(100, decimals));
  return fixed.replace(/\.0*$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/**
 * Parses `input` once and returns an evaluator. Nothing is evaluated here, so a
 * graph can compile a function, then call it for every column of the viewport.
 */
export function compileExpression(input: string, options: CompileOptions = {}): CompileResult {
  const mode = options.angleMode ?? 'deg';
  const ans = Number.isFinite(options.ans ?? 0) ? (options.ans ?? 0) : 0;

  if (input.trim() === '') return { ok: false, error: 'Enter an expression.' };
  if (input.length > MAX_LENGTH) {
    return {
      ok: false,
      error: `The expression is longer than ${MAX_LENGTH.toLocaleString('en-GB')} characters.`,
    };
  }

  const variables = new Set(options.variables ?? []);
  try {
    const evaluate = new Parser(tokenize(input), mode, ans, variables).parse();
    return { ok: true, compiled: { evaluate: (scope = {}) => evaluate(scope) } };
  } catch (error) {
    if (error instanceof CalcError) return { ok: false, error: error.message };
    return { ok: false, error: 'The expression could not be evaluated.' };
  }
}

export function evaluateExpression(input: string, options: CalcOptions = {}): CalcResult {
  const digits = options.significantDigits ?? DEFAULT_DIGITS;
  const compiled = compileExpression(input, options);
  if (!compiled.ok) return { ok: false, error: compiled.error };

  try {
    const value = compiled.compiled.evaluate();
    if (Number.isNaN(value)) return { ok: false, error: 'That calculation has no real value.' };
    if (!Number.isFinite(value)) return { ok: false, error: 'The result is too large to show.' };
    return { ok: true, value, display: formatNumber(value, digits) };
  } catch (error) {
    if (error instanceof CalcError) return { ok: false, error: error.message };
    return { ok: false, error: 'The expression could not be evaluated.' };
  }
}

export const CALCULATOR_LIMITS = Object.freeze({
  maxLength: MAX_LENGTH,
  maxDepth: MAX_DEPTH,
  maxFactorial: MAX_FACTORIAL,
  defaultDigits: DEFAULT_DIGITS,
});
