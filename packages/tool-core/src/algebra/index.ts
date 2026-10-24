/**
 * Symbolic algebra over exact rationals, with no `eval` and no `Function`.
 *
 * The grammar is the scientific calculator's, parsed again here because the
 * calculator compiles straight to a closure while algebra needs a tree it can
 * rearrange. Multiplication must be written out: `2x` is rejected exactly as
 * `sci-calc` rejects it (DEC-39), because implicit multiplication has its own
 * precedence rules.
 *
 * What is supported is stated in `SUPPORTED` and in the tool's UI, and the
 * engine refuses the rest with a sentence rather than guessing:
 *
 * - polynomials in one variable: simplify, expand, differentiate, evaluate;
 * - factorising by rational roots, with a quadratic left over handled exactly;
 * - linear and quadratic equations, and higher degrees up to their rational
 *   roots (anything left over is reported, not hidden);
 * - linear systems in up to three unknowns, by exact Gaussian elimination.
 *
 * Division by anything containing a variable, non-integer exponents, and
 * functions such as sin or sqrt are not part of this engine.
 */

export type AlgebraOperation =
  | 'simplify'
  | 'expand'
  | 'factor'
  | 'solve'
  | 'differentiate'
  | 'evaluate'
  | 'system';

export interface AlgebraRequest {
  readonly operation: AlgebraOperation;
  readonly expression: string;
  /** `evaluate` and `system` only: the x value or the equations, as written. */
  readonly value?: string;
}

export interface AlgebraResult {
  readonly ok: boolean;
  readonly error: string | null;
  /** The answer in one line. */
  readonly headline: string;
  readonly steps: readonly string[];
  readonly notes: readonly string[];
}

/** Input limits, mirrored in the tool's copy. */
export const MAX_INPUT_LENGTH = 1000;
export const MAX_DEPTH = 100;
export const MAX_EXPONENT = 64;

export const SUPPORTED =
  'Polynomials in one variable, linear systems in up to three, exact fractions. Not: functions, roots of x, division by x, or non-integer powers.';

export class AlgebraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlgebraError';
  }
}

/* ------------------------------------------------------------------ */
/* Exact fractions                                                     */
/* ------------------------------------------------------------------ */

export interface Fraction {
  readonly n: bigint;
  readonly d: bigint;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = abs(left);
  let b = abs(right);
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0n ? 1n : a;
}

export function fraction(n: bigint | number, d: bigint | number = 1n): Fraction {
  const top = typeof n === 'bigint' ? n : BigInt(Math.trunc(n));
  const bottom = typeof d === 'bigint' ? d : BigInt(Math.trunc(d));
  if (bottom === 0n) throw new AlgebraError('Cannot divide by zero.');
  const sign = bottom < 0n ? -1n : 1n;
  const divisor = gcd(top, bottom);
  return { n: (top * sign) / divisor, d: (bottom * sign) / divisor };
}

const ZERO = fraction(0n);
const ONE = fraction(1n);

function isZero(value: Fraction): boolean {
  return value.n === 0n;
}

function isOne(value: Fraction): boolean {
  return value.n === 1n && value.d === 1n;
}

function add(left: Fraction, right: Fraction): Fraction {
  return fraction(left.n * right.d + right.n * left.d, left.d * right.d);
}

function sub(left: Fraction, right: Fraction): Fraction {
  return fraction(left.n * right.d - right.n * left.d, left.d * right.d);
}

function mul(left: Fraction, right: Fraction): Fraction {
  return fraction(left.n * right.n, left.d * right.d);
}

function divide(left: Fraction, right: Fraction): Fraction {
  if (isZero(right)) throw new AlgebraError('Cannot divide by zero.');
  return fraction(left.n * right.d, left.d * right.n);
}

function negate(value: Fraction): Fraction {
  return { n: -value.n, d: value.d };
}

function equal(left: Fraction, right: Fraction): boolean {
  return left.n === right.n && left.d === right.d;
}

function fractionText(value: Fraction): string {
  return value.d === 1n ? `${value.n}` : `${value.n}/${value.d}`;
}

function decimalText(value: Fraction): string {
  const number = Number(value.n) / Number(value.d);
  if (!Number.isFinite(number)) return fractionText(value);
  if (Number.isInteger(number)) return `${number}`;
  return `${Number(number.toPrecision(10))}`;
}

/* ------------------------------------------------------------------ */
/* Tokens and parsing                                                  */
/* ------------------------------------------------------------------ */

type Token =
  | { readonly kind: 'number'; readonly value: Fraction }
  | { readonly kind: 'name'; readonly value: string }
  | { readonly kind: 'operator'; readonly value: string }
  | { readonly kind: 'open' }
  | { readonly kind: 'close' };

const OPERATORS = new Set(['+', '-', '*', '/', '^', '=']);

function tokenise(source: string): Token[] {
  if (source.length > MAX_INPUT_LENGTH) {
    throw new AlgebraError(`The input is longer than ${MAX_INPUT_LENGTH} characters.`);
  }
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index] as string;
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(character)) {
      const start = index;
      while (index < source.length && /[0-9.]/.test(source[index] as string)) index += 1;
      const text = source.slice(start, index);
      if ((text.match(/\./g) ?? []).length > 1 || text === '.') {
        throw new AlgebraError(`“${text}” is not a number.`);
      }
      const [whole = '0', decimals = ''] = text.split('.');
      tokens.push({
        kind: 'number',
        value: fraction(
          BigInt(`${whole === '' ? '0' : whole}${decimals}`),
          10n ** BigInt(decimals.length),
        ),
      });
      continue;
    }
    if (/[a-zA-Z]/.test(character)) {
      const start = index;
      while (index < source.length && /[a-zA-Z]/.test(source[index] as string)) index += 1;
      tokens.push({ kind: 'name', value: source.slice(start, index) });
      continue;
    }
    if (character === '(') {
      tokens.push({ kind: 'open' });
      index += 1;
      continue;
    }
    if (character === ')') {
      tokens.push({ kind: 'close' });
      index += 1;
      continue;
    }
    if (OPERATORS.has(character)) {
      tokens.push({ kind: 'operator', value: character });
      index += 1;
      continue;
    }
    throw new AlgebraError(`“${character}” is not something this tool understands.`);
  }
  return tokens;
}

export type Node =
  | { readonly kind: 'number'; readonly value: Fraction }
  | { readonly kind: 'variable'; readonly name: string }
  | {
      readonly kind: 'binary';
      readonly operator: '+' | '-' | '*' | '/' | '^';
      readonly left: Node;
      readonly right: Node;
    }
  | { readonly kind: 'negate'; readonly value: Node };

interface ParseState {
  readonly tokens: readonly Token[];
  index: number;
  depth: number;
}

function parseExpression(state: ParseState): Node {
  state.depth += 1;
  if (state.depth > MAX_DEPTH) throw new AlgebraError('The expression is nested too deeply.');
  let node = parseTerm(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (token?.kind === 'operator' && (token.value === '+' || token.value === '-')) {
      state.index += 1;
      const right = parseTerm(state);
      node = { kind: 'binary', operator: token.value, left: node, right };
    } else break;
  }
  state.depth -= 1;
  return node;
}

function parseTerm(state: ParseState): Node {
  let node = parseUnary(state);
  for (;;) {
    const token = state.tokens[state.index];
    if (token?.kind === 'operator' && (token.value === '*' || token.value === '/')) {
      state.index += 1;
      const right = parseUnary(state);
      node = { kind: 'binary', operator: token.value, left: node, right };
    } else break;
  }
  return node;
}

function parseUnary(state: ParseState): Node {
  const token = state.tokens[state.index];
  if (token?.kind === 'operator' && (token.value === '-' || token.value === '+')) {
    state.index += 1;
    const value = parseUnary(state);
    return token.value === '-' ? { kind: 'negate', value } : value;
  }
  return parsePower(state);
}

function parsePower(state: ParseState): Node {
  const base = parsePrimary(state);
  const token = state.tokens[state.index];
  if (token?.kind === 'operator' && token.value === '^') {
    state.index += 1;
    // Right-associative, like every other power here.
    const exponent = parseUnary(state);
    return { kind: 'binary', operator: '^', left: base, right: exponent };
  }
  return base;
}

function parsePrimary(state: ParseState): Node {
  const token = state.tokens[state.index];
  if (token === undefined) throw new AlgebraError('The expression is incomplete.');
  if (token.kind === 'number') {
    state.index += 1;
    return { kind: 'number', value: token.value };
  }
  if (token.kind === 'name') {
    state.index += 1;
    if (token.value !== 'x' && token.value !== 'y' && token.value !== 'z') {
      throw new AlgebraError(`“${token.value}” is not a variable here; use x, y or z.`);
    }
    return { kind: 'variable', name: token.value };
  }
  if (token.kind === 'open') {
    state.index += 1;
    const node = parseExpression(state);
    const close = state.tokens[state.index];
    if (close?.kind !== 'close') throw new AlgebraError('A bracket is not closed.');
    state.index += 1;
    return node;
  }
  throw new AlgebraError(
    `“${token.kind === 'operator' ? token.value : ')'}” cannot start an expression.`,
  );
}

/** Splits `left = right` into its two halves, or returns one expression. */
function splitEquation(source: string): [string, string | null] {
  const parts = source.split('=');
  if (parts.length > 2) throw new AlgebraError('An equation has one “=” sign.');
  return [parts[0] as string, parts.length === 2 ? (parts[1] as string) : null];
}

function parseFully(source: string): Node {
  const state: ParseState = { tokens: tokenise(source), index: 0, depth: 0 };
  const node = parseExpression(state);
  if (state.index !== state.tokens.length) {
    throw new AlgebraError('There is something left over at the end of the expression.');
  }
  return node;
}

/* ------------------------------------------------------------------ */
/* Polynomials                                                         */
/* ------------------------------------------------------------------ */

/** Coefficients from the constant term upwards; trailing zeros trimmed. */
export type Polynomial = readonly Fraction[];

function trim(coefficients: Fraction[]): Polynomial {
  let end = coefficients.length;
  while (end > 0 && isZero(coefficients[end - 1] as Fraction)) end -= 1;
  return coefficients.slice(0, end);
}

function polyAdd(left: Polynomial, right: Polynomial): Polynomial {
  const length = Math.max(left.length, right.length);
  const out: Fraction[] = [];
  for (let index = 0; index < length; index += 1) {
    out.push(add(left[index] ?? ZERO, right[index] ?? ZERO));
  }
  return trim(out);
}

function polyScale(value: Polynomial, factor: Fraction): Polynomial {
  return trim(value.map((coefficient) => mul(coefficient, factor)));
}

function polySub(left: Polynomial, right: Polynomial): Polynomial {
  return polyAdd(left, polyScale(right, fraction(-1n)));
}

function polyMul(left: Polynomial, right: Polynomial): Polynomial {
  if (left.length === 0 || right.length === 0) return [];
  const out: Fraction[] = Array.from({ length: left.length + right.length - 1 }, () => ZERO);
  for (const [i, a] of left.entries()) {
    for (const [j, b] of right.entries()) {
      out[i + j] = add(out[i + j] as Fraction, mul(a, b));
    }
  }
  return trim(out);
}

function polyPow(base: Polynomial, exponent: number): Polynomial {
  if (exponent === 0) return [ONE];
  let result: Polynomial = [ONE];
  for (let index = 0; index < exponent; index += 1) result = polyMul(result, base);
  return result;
}

function degree(value: Polynomial): number {
  return value.length - 1;
}

function integerExponent(node: Node): number {
  if (node.kind === 'number' && node.value.d === 1n) {
    const value = Number(node.value.n);
    if (Number.isInteger(value) && value >= 0) {
      if (value > MAX_EXPONENT)
        throw new AlgebraError(`Powers above ${MAX_EXPONENT} are out of scope.`);
      return value;
    }
  }
  throw new AlgebraError('A power must be a whole number of 0 or more here.');
}

/** Compiles a parse tree into a polynomial in x, refusing anything else. */
export function toPolynomial(node: Node): Polynomial {
  if (node.kind === 'number') return isZero(node.value) ? [] : [node.value];
  if (node.kind === 'variable') {
    if (node.name !== 'x') throw new AlgebraError(`Only x is a variable here, not ${node.name}.`);
    return [ZERO, ONE];
  }
  if (node.kind === 'negate') return polyScale(toPolynomial(node.value), fraction(-1n));
  const left = toPolynomial(node.left);
  const right = toPolynomial(node.right);
  switch (node.operator) {
    case '+':
      return polyAdd(left, right);
    case '-':
      return polySub(left, right);
    case '*':
      return polyMul(left, right);
    case '/': {
      if (degree(right) !== 0)
        throw new AlgebraError('Dividing by something containing x is not supported.');
      return polyScale(left, divide(ONE, right[0] as Fraction));
    }
    case '^': {
      if (degree(right) !== 0)
        throw new AlgebraError('A power must be a number, not an expression.');
      if (degree(left) === 0 && Number.isInteger(Number(left[0]?.n)) && left[0]?.d === 1n) {
        const base = Number(left[0]?.n);
        const exponent = Number(right[0]?.n);
        if (exponent < 0) return [divide(ONE, fraction(BigInt(base) ** BigInt(-exponent)))];
        return [fraction(BigInt(base) ** BigInt(exponent))];
      }
      return polyPow(left, integerExponent(node.right));
    }
    default:
      throw new AlgebraError('That operator is not supported.');
  }
}

function polyText(value: Polynomial): string {
  if (value.length === 0) return '0';
  const terms: string[] = [];
  for (let power = value.length - 1; power >= 0; power -= 1) {
    const coefficient = value[power] as Fraction;
    if (isZero(coefficient)) continue;
    const negative = coefficient.n < 0n;
    const magnitude = negative ? negate(coefficient) : coefficient;
    const powerText = power === 0 ? '' : power === 1 ? 'x' : `x^${power}`;
    const coefficientText =
      power === 0
        ? fractionText(magnitude)
        : isOne(magnitude)
          ? ''
          : coefficient.d === 1n
            ? `${magnitude.n}`
            : `(${fractionText(magnitude)})`;
    const term = power === 0 ? fractionText(magnitude) : `${coefficientText}${powerText}`;
    if (terms.length === 0) terms.push(negative ? `-${term}` : term);
    else terms.push(`${negative ? '-' : '+'} ${term}`);
  }
  return terms.join(' ');
}

function polyEvaluate(value: Polynomial, at: Fraction): Fraction {
  let total = ZERO;
  for (let power = value.length - 1; power >= 0; power -= 1) {
    total = add(mul(total, at), value[power] as Fraction);
  }
  return total;
}

function polyDerivative(value: Polynomial): Polynomial {
  return trim(
    value.slice(1).map((coefficient, index) => mul(coefficient, fraction(BigInt(index + 1)))),
  );
}

/**
 * Synthetic division by `(x - root)`: the classic Horner pass, highest power
 * first. The last accumulator is the remainder; the rest is the quotient.
 */
function divideByRoot(value: Polynomial, root: Fraction): Polynomial | null {
  const coefficients = [...value].reverse();
  if (coefficients.length < 2) return null;
  const accumulated: Fraction[] = [coefficients[0] as Fraction];
  for (let index = 1; index < coefficients.length; index += 1) {
    accumulated.push(
      add(coefficients[index] as Fraction, mul(root, accumulated[index - 1] as Fraction)),
    );
  }
  const remainder = accumulated.pop() as Fraction;
  return isZero(remainder) ? trim(accumulated.reverse()) : null;
}

/** Every p/q with p dividing the constant term and q dividing the leading one. */
function rationalRootCandidates(value: Polynomial): Fraction[] {
  const constant = value[0] as Fraction;
  const leading = value[value.length - 1] as Fraction;
  if (isZero(constant)) return [ZERO];
  const divisors = (target: bigint): bigint[] => {
    const out: bigint[] = [];
    const size = abs(target);
    for (let candidate = 1n; candidate * candidate <= size; candidate += 1n) {
      if (size % candidate === 0n) out.push(candidate, size / candidate);
    }
    return [...new Set(out)];
  };
  const candidates: Fraction[] = [];
  for (const p of divisors(constant.n)) {
    for (const q of divisors(leading.n)) {
      candidates.push(fraction(p, q), fraction(-p, q));
    }
  }
  return candidates;
}

/* ------------------------------------------------------------------ */
/* Formatting and answers                                              */
/* ------------------------------------------------------------------ */

function polynomialNormalForm(value: Polynomial): string {
  return polyText(value) === '0' ? '0' : polyText(value);
}

/** `(x − 2)` and friends: a factor with rational coefficients, presented cleanly. */
function linearFactor(root: Fraction): string {
  // root = -c / a written as (a x + c) with integer a and c.
  const a = root.d;
  const c = -root.n;
  const first = a === 1n ? 'x' : `${a}x`;
  if (c === 0n) return a === 1n ? 'x' : `${a}x`;
  return c > 0n ? `(${first} + ${c})` : `(${first} - ${-c})`;
}

function squareRootOf(value: bigint): bigint | null {
  if (value < 0n) return null;
  if (value < 2n) return value;
  let guess = BigInt(Math.floor(Math.sqrt(Number(value))));
  if (Number.isFinite(Number(value)) === false) return null;
  for (let step = 0; step < 20; step += 1) {
    const next = (guess + value / guess) / 2n;
    if (next === guess) break;
    guess = next;
  }
  for (const candidate of [guess - 2n, guess - 1n, guess, guess + 1n, guess + 2n]) {
    if (candidate >= 0n && candidate * candidate === value) return candidate;
  }
  return null;
}

function fail(error: string): AlgebraResult {
  return { ok: false, error, headline: '', steps: [], notes: [] };
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

function simplify(source: string): AlgebraResult {
  const polynomial = toPolynomial(parseFully(source));
  const steps = [`Multiply everything out: ${polynomialNormalForm(polynomial)}`];
  return {
    ok: true,
    error: null,
    headline: polynomialNormalForm(polynomial),
    steps,
    notes: degree(polynomial) < 0 ? ['This expression is zero everywhere.'] : [],
  };
}

function expand(source: string): AlgebraResult {
  const polynomial = toPolynomial(parseFully(source));
  const isFactorised = source.includes('(') && polynomial.length > 1;
  return {
    ok: true,
    error: null,
    headline: polynomialNormalForm(polynomial),
    steps: isFactorised
      ? [
          'Multiply every term by every other term.',
          `Collect like terms: ${polynomialNormalForm(polynomial)}`,
        ]
      : [`There are no brackets to multiply out: ${polynomialNormalForm(polynomial)}`],
    notes: [],
  };
}

function factor(source: string): AlgebraResult {
  const original = toPolynomial(parseFully(source));
  const steps: string[] = [`Standard form: ${polynomialNormalForm(original)}`];
  if (degree(original) < 1) {
    return {
      ok: true,
      error: null,
      headline: polynomialNormalForm(original),
      steps,
      notes: ['A constant has no factors in x.'],
    };
  }

  // Work on integers: the rational-root search needs whole-number end terms.
  const common = original.reduce(
    (left, coefficient) => (left * coefficient.d) / gcd(left, coefficient.d),
    1n,
  );
  let working = common === 1n ? original : polyScale(original, fraction(common));
  if (common !== 1n) steps.push(`Clear the fractions by multiplying by ${common}.`);

  let sign = ONE;
  if ((working[degree(working)] as Fraction).n < 0n) {
    working = polyScale(working, fraction(-1n));
    sign = fraction(-1n);
    steps.push('The leading coefficient is negative, so -1 comes out first.');
  }

  const roots: Fraction[] = [];
  for (;;) {
    if (degree(working) < 1) break;
    const root = rationalRootCandidates(working).find((candidate) =>
      isZero(polyEvaluate(working, candidate)),
    );
    if (root === undefined) break;
    const quotient = divideByRoot(working, root);
    if (quotient === null) break;
    roots.push(root);
    steps.push(`x = ${fractionText(root)} is a root, so ${linearFactor(root)} divides it exactly.`);
    working = quotient;
  }

  if (roots.length === 0) {
    return {
      ok: true,
      error: null,
      headline: polynomialNormalForm(original),
      steps,
      notes: ['No rational roots, so this tool cannot factor it further over the rationals.'],
    };
  }

  // Each (x - p/q) factor is presented as (q x - p), and the q's are divided out
  // of what is left so the product still equals the original.
  let scale = sign;
  const parts: string[] = [];
  for (const root of roots) {
    parts.push(linearFactor(root));
    scale = divide(scale, fraction(root.d));
  }
  if (degree(working) === 0) {
    scale = mul(scale, working[0] as Fraction);
  }
  if (common !== 1n) scale = divide(scale, fraction(common));

  const factors: string[] = [];
  if (!isOne(scale)) factors.push(fractionText(scale));
  factors.push(...parts);
  if (degree(working) > 0) factors.push(`(${polynomialNormalForm(working)})`);

  return {
    ok: true,
    error: null,
    headline: factors.join(''),
    steps,
    notes:
      degree(working) > 0
        ? [`The bracket of degree ${degree(working)} has no rational roots left to take out.`]
        : [],
  };
}

function solve(source: string): AlgebraResult {
  const [left, right] = splitEquation(source);
  const polynomial = polySub(
    toPolynomial(parseFully(left)),
    right === null ? [] : toPolynomial(parseFully(right)),
  );
  const steps: string[] = [
    right === null
      ? `Take the expression as equal to zero: ${polynomialNormalForm(polynomial)} = 0`
      : `Move everything to the left: ${polynomialNormalForm(polynomial)} = 0`,
  ];
  const order = degree(polynomial);

  if (order < 0) {
    return {
      ok: true,
      error: null,
      headline: 'Every value of x',
      steps,
      notes: ['Both sides are the same, so the equation is true for every x.'],
    };
  }
  if (order === 0) {
    return {
      ok: true,
      error: null,
      headline: 'No solution',
      steps,
      notes: ['The x terms cancel and the two sides disagree, so no value of x works.'],
    };
  }
  if (order === 1) {
    const [c, b] = [polynomial[0] as Fraction, polynomial[1] as Fraction];
    const root = divide(negate(c), b);
    steps.push(
      isOne(b)
        ? `Subtract ${fractionText(c)} and divide by ${fractionText(b)}: x = ${fractionText(root)}`
        : `x = ${fractionText(negate(c))} ÷ ${fractionText(b)} = ${fractionText(root)}`,
    );
    return { ok: true, error: null, headline: `x = ${fractionText(root)}`, steps, notes: [] };
  }
  if (order === 2) {
    const [c, b, a] = [
      polynomial[0] as Fraction,
      polynomial[1] as Fraction,
      polynomial[2] as Fraction,
    ];
    const discriminant = sub(mul(b, b), mul(fraction(4n), mul(a, c)));
    steps.push(
      `Discriminant: b² − 4ac = (${fractionText(b)})² − 4 × ${fractionText(a)} × ${fractionText(c)} = ${fractionText(discriminant)}`,
    );
    if (discriminant.n < 0n) {
      steps.push('A negative discriminant means no real roots.');
      return { ok: true, error: null, headline: 'No real roots', steps, notes: [] };
    }
    const square = discriminant.d === 1n ? squareRootOf(discriminant.n) : null;
    const twoA = mul(fraction(2n), a);
    if (square !== null) {
      const first = divide(sub(negate(b), fraction(square)), twoA);
      const second = divide(add(negate(b), fraction(square)), twoA);
      steps.push(`√${fractionText(discriminant)} = ${square}, so the roots are exact.`);
      const headline = equal(first, second)
        ? `x = ${fractionText(first)}`
        : `x = ${fractionText(first)} or x = ${fractionText(second)}`;
      return { ok: true, error: null, headline, steps, notes: [] };
    }
    const surd = (sign: 1 | -1): string => {
      const root = `√${fractionText(discriminant)}`;
      if (isZero(b)) return `${sign < 0 ? '-' : ''}${root} / ${fractionText(twoA)}`;
      return `(${fractionText(negate(b))} ${sign < 0 ? '-' : '+'} ${root}) / ${fractionText(twoA)}`;
    };
    const first = surd(-1);
    const second = surd(1);
    steps.push('The discriminant is not a perfect square, so the roots stay in surd form.');
    return {
      ok: true,
      error: null,
      headline: `x = ${first} or x = ${second}`,
      steps,
      notes: ['Surd roots: irrational, so they cannot be written as exact fractions.'],
    };
  }

  const roots: Fraction[] = [];
  let remaining = polynomial;
  for (;;) {
    if (degree(remaining) < 1) break;
    const root = rationalRootCandidates(remaining).find((candidate) =>
      isZero(polyEvaluate(remaining, candidate)),
    );
    if (root === undefined) break;
    const quotient = divideByRoot(remaining, root);
    if (quotient === null) break;
    roots.push(root);
    remaining = quotient;
  }
  const unique = [...new Set(roots.map(fractionText))];
  steps.push(`Tried the divisors of the end terms and found ${unique.length} rational root(s).`);
  return {
    ok: true,
    error: null,
    headline:
      unique.length === 0 ? 'No rational roots' : unique.map((root) => `x = ${root}`).join(' or '),
    steps,
    notes:
      degree(remaining) > 0
        ? [
            `A factor of degree ${degree(remaining)} is left over (${polynomialNormalForm(remaining)}); it may have irrational or complex roots this tool does not look for.`,
          ]
        : [],
  };
}

function differentiate(source: string): AlgebraResult {
  const polynomial = toPolynomial(parseFully(source));
  const derivative = polyDerivative(polynomial);
  return {
    ok: true,
    error: null,
    headline: polynomialNormalForm(derivative),
    steps: [
      `Differentiate term by term: ${polynomialNormalForm(polynomial)}`,
      `d/dx = ${polynomialNormalForm(derivative)}`,
    ],
    notes: [],
  };
}

function evaluate(source: string, at: string): AlgebraResult {
  const polynomial = toPolynomial(parseFully(source));
  const x = toValue(at);
  const result = polyEvaluate(polynomial, x);
  return {
    ok: true,
    error: null,
    headline: fractionText(result),
    steps: [
      `Substitute x = ${fractionText(x)} into ${polynomialNormalForm(polynomial)}.`,
      `The exact value is ${fractionText(result)}${result.d === 1n ? '' : `, which is ${decimalText(result)}`}.`,
    ],
    notes: [],
  };
}

/** A single number for `evaluate`, parsed exactly. */
function toValue(source: string): Fraction {
  const node = parseFully(source.trim());
  if (node.kind !== 'number') {
    if (node.kind === 'negate' && node.value.kind === 'number') return negate(node.value.value);
    throw new AlgebraError('The value must be a number.');
  }
  return node.value;
}

/* ------------------------------------------------------------------ */
/* Linear systems                                                      */
/* ------------------------------------------------------------------ */

interface Linear {
  readonly coefficients: ReadonlyMap<string, Fraction>;
  readonly constant: Fraction;
}

const NO_COEFFICIENTS = new Map<string, Fraction>();

function linearAdd(left: Linear, right: Linear, sign = 1): Linear {
  const coefficients = new Map(left.coefficients);
  for (const [name, value] of right.coefficients) {
    coefficients.set(name, add(coefficients.get(name) ?? ZERO, sign > 0 ? value : negate(value)));
  }
  return {
    coefficients,
    constant: sign > 0 ? add(left.constant, right.constant) : sub(left.constant, right.constant),
  };
}

function linearScale(value: Linear, factor: Fraction): Linear {
  const coefficients = new Map<string, Fraction>();
  for (const [name, coefficient] of value.coefficients) {
    coefficients.set(name, mul(coefficient, factor));
  }
  return { coefficients, constant: mul(value.constant, factor) };
}

function toLinear(node: Node): Linear {
  if (node.kind === 'number') return { coefficients: NO_COEFFICIENTS, constant: node.value };
  if (node.kind === 'variable') {
    return { coefficients: new Map([[node.name, ONE]]), constant: ZERO };
  }
  if (node.kind === 'negate') return linearScale(toLinear(node.value), fraction(-1n));
  const left = toLinear(node.left);
  const right = toLinear(node.right);
  switch (node.operator) {
    case '+':
      return linearAdd(left, right);
    case '-':
      return linearAdd(left, right, -1);
    case '*': {
      if (left.coefficients.size > 0 && right.coefficients.size > 0) {
        throw new AlgebraError(
          'A system takes linear equations: two unknowns multiplied together is not linear.',
        );
      }
      const constant = right.coefficients.size === 0 ? right : left;
      const other = right.coefficients.size === 0 ? left : right;
      return linearScale(other, constant.constant);
    }
    case '/':
      if (right.coefficients.size > 0)
        throw new AlgebraError('Dividing by an unknown is not supported.');
      return linearScale(left, divide(ONE, right.constant));
    case '^': {
      const exponent = integerExponent(node.right);
      if (exponent === 0) return { coefficients: NO_COEFFICIENTS, constant: ONE };
      if (exponent === 1) return left;
      throw new AlgebraError('A system takes linear equations: an unknown squared is not linear.');
    }
    default:
      throw new AlgebraError('That operator is not supported.');
  }
}

function solveSystem(source: string): AlgebraResult {
  const lines = source
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (lines.length < 2 || lines.length > 3) {
    throw new AlgebraError('A system takes two or three equations, one per line.');
  }
  const names = new Set<string>();
  const rows = lines.map((line) => {
    const [left, right] = splitEquation(line);
    if (right === null) throw new AlgebraError(`“${line}” has no “=” sign.`);
    const combined = linearAdd(toLinear(parseFully(left)), toLinear(parseFully(right)), -1);
    for (const name of combined.coefficients.keys()) names.add(name);
    return combined;
  });
  const unknowns = [...names].sort();
  if (unknowns.length === 0) throw new AlgebraError('None of the equations has an unknown.');
  if (unknowns.length > 3) throw new AlgebraError('At most three unknowns are supported.');

  // Augmented matrix: coefficients then the negated constant.
  const matrix = rows.map((row) => [
    ...unknowns.map((name) => row.coefficients.get(name) ?? ZERO),
    negate(row.constant),
  ]);

  const steps: string[] = [`Eliminate one unknown at a time, keeping every fraction exact.`];
  for (let column = 0; column < unknowns.length; column += 1) {
    let pivot = column;
    while (pivot < matrix.length && isZero((matrix[pivot] as Fraction[])[column] as Fraction))
      pivot += 1;
    if (pivot === matrix.length) continue;
    if (pivot !== column) {
      const swap = matrix[pivot] as Fraction[];
      matrix[pivot] = matrix[column] as Fraction[];
      matrix[column] = swap;
    }
    const head = matrix[column] as Fraction[];
    const divisor = head[column] as Fraction;
    for (let index = column; index <= unknowns.length; index += 1) {
      head[index] = divide(head[index] as Fraction, divisor);
    }
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === column) continue;
      const target = matrix[row] as Fraction[];
      const factor = target[column] as Fraction;
      if (isZero(factor)) continue;
      for (let index = column; index <= unknowns.length; index += 1) {
        target[index] = sub(target[index] as Fraction, mul(factor, head[index] as Fraction));
      }
    }
  }

  // A row of zeros with a non-zero constant means the system contradicts itself.
  for (const row of matrix) {
    if (row.slice(0, unknowns.length).every(isZero) && !isZero(row[unknowns.length] as Fraction)) {
      return {
        ok: true,
        error: null,
        headline: 'No solution',
        steps,
        notes: ['One equation contradicts the others.'],
      };
    }
  }
  const rank = matrix.filter((row) =>
    row.slice(0, unknowns.length).some((value) => !isZero(value)),
  ).length;
  if (rank < unknowns.length) {
    return {
      ok: true,
      error: null,
      headline: 'Infinitely many solutions',
      steps,
      notes: ['The equations are not independent, so the unknowns are not pinned down.'],
    };
  }

  const values = unknowns.map(
    (name, index) => `${name} = ${fractionText(matrix[index]?.[unknowns.length] as Fraction)}`,
  );
  steps.push(`Read the solution off the reduced matrix: ${values.join(', ')}.`);
  return { ok: true, error: null, headline: values.join(', '), steps, notes: [] };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function runAlgebra(request: AlgebraRequest): AlgebraResult {
  try {
    const source = request.expression.trim();
    if (source === '') return fail('Enter an expression.');
    switch (request.operation) {
      case 'simplify':
        return simplify(source);
      case 'expand':
        return expand(source);
      case 'factor':
        return factor(source);
      case 'solve':
        return solve(source);
      case 'differentiate':
        return differentiate(source);
      case 'evaluate':
        return evaluate(source, request.value ?? '0');
      case 'system':
        return solveSystem(source);
      default:
        return fail('Unknown operation.');
    }
  } catch (cause) {
    return fail(cause instanceof Error ? cause.message : 'That could not be worked out.');
  }
}
