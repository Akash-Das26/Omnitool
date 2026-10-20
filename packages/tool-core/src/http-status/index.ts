/**
 * HTTP status codes, written for Omnitool.
 *
 * The codes and their registered names follow the IANA HTTP Status Code Registry
 * (https://www.iana.org/assignments/http-status-codes/) and the semantics follow
 * RFC 9110 ("HTTP Semantics", section 15). The one-sentence meanings and the
 * "typical use" notes here are our own wording; nothing is copied from either
 * document or from another tool.
 */

export type StatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

export const STATUS_CLASSES: readonly StatusClass[] = ['1xx', '2xx', '3xx', '4xx', '5xx'];

export interface HttpStatus {
  readonly code: number;
  readonly name: string;
  readonly className: StatusClass;
  /** One sentence: what the response says. */
  readonly meaning: string;
  /** One sentence: when a server or client normally sends it. */
  readonly use: string;
}

/** The class of a code is its first digit; anything outside 100-599 has none. */
export function statusClass(code: number): StatusClass | null {
  if (!Number.isInteger(code) || code < 100 || code > 599) return null;
  const first = String(code)[0];
  return `${first}xx` as StatusClass;
}

export const HTTP_STATUSES: readonly HttpStatus[] = [
  {
    code: 100,
    name: 'Continue',
    className: '1xx',
    meaning: 'The request line and headers were received and the client may send the body.',
    use: 'Sent before a large upload so the client can abandon work the server already rejects.',
  },
  {
    code: 101,
    name: 'Switching Protocols',
    className: '1xx',
    meaning: 'The server is changing to the protocol named in the Upgrade header.',
    use: 'Used when a connection moves from HTTP/1.1 to WebSocket.',
  },
  {
    code: 102,
    name: 'Processing',
    className: '1xx',
    meaning: 'The server has started work but has no final response yet.',
    use: 'Keeps a long WebDAV request alive so the client does not time out.',
  },
  {
    code: 103,
    name: 'Early Hints',
    className: '1xx',
    meaning: 'The server is sending headers before the final response.',
    use: 'Lets a browser start fetching stylesheets or fonts while the page is still generated.',
  },
  {
    code: 200,
    name: 'OK',
    className: '2xx',
    meaning: 'The request succeeded and the body holds the result.',
    use: 'The ordinary answer to a successful GET, HEAD or POST.',
  },
  {
    code: 201,
    name: 'Created',
    className: '2xx',
    meaning: 'The request succeeded and created a resource.',
    use: 'Follows a POST that adds a record; the Location header points at the new thing.',
  },
  {
    code: 202,
    name: 'Accepted',
    className: '2xx',
    meaning: 'The request was accepted for processing but is not finished.',
    use: 'Queues a job and returns a handle the client can poll.',
  },
  {
    code: 203,
    name: 'Non-Authoritative Information',
    className: '2xx',
    meaning: 'The response succeeded but the headers came from a transforming proxy.',
    use: 'Very rare; a proxy that rewrites metadata can mark its copy this way.',
  },
  {
    code: 204,
    name: 'No Content',
    className: '2xx',
    meaning: 'The request succeeded and there is deliberately no body.',
    use: 'Answers a DELETE or an autosave so the client changes nothing.',
  },
  {
    code: 205,
    name: 'Reset Content',
    className: '2xx',
    meaning: 'The request succeeded and the client should reset its view of the resource.',
    use: 'Tells a form or editor to clear itself after a submission.',
  },
  {
    code: 206,
    name: 'Partial Content',
    className: '2xx',
    meaning: 'The body is one requested range of the resource.',
    use: 'Answers a Range request so a player or downloader can resume.',
  },
  {
    code: 300,
    name: 'Multiple Choices',
    className: '3xx',
    meaning: 'Several representations exist and the client must pick one.',
    use: 'Rare; a body usually lists the alternatives with their own links.',
  },
  {
    code: 301,
    name: 'Moved Permanently',
    className: '3xx',
    meaning: 'The resource now lives at another URL and the change is permanent.',
    use: 'Redirects an old path to its replacement so caches and search engines follow.',
  },
  {
    code: 302,
    name: 'Found',
    className: '3xx',
    meaning: 'The resource is temporarily at another URL.',
    use: 'Sends a visitor on after a form post; the original URL stays valid.',
  },
  {
    code: 303,
    name: 'See Other',
    className: '3xx',
    meaning: 'The result of the request can be read from another URL with a GET.',
    use: 'Redirects to a confirmation page after a successful POST.',
  },
  {
    code: 304,
    name: 'Not Modified',
    className: '3xx',
    meaning: 'The cached copy is still current, so there is no body.',
    use: 'Answers a conditional request that carries an ETag or Last-Modified value.',
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    className: '3xx',
    meaning: 'The resource is temporarily elsewhere and the method must not change.',
    use: 'Moves an upload while keeping it a POST, unlike 302.',
  },
  {
    code: 308,
    name: 'Permanent Redirect',
    className: '3xx',
    meaning: 'The resource has moved for good and the method must not change.',
    use: 'The permanent counterpart of 307 for APIs that must keep the verb.',
  },
  {
    code: 400,
    name: 'Bad Request',
    className: '4xx',
    meaning: 'The server cannot process the request because it is malformed.',
    use: 'Answers unparseable JSON or a missing required parameter.',
  },
  {
    code: 401,
    name: 'Unauthorized',
    className: '4xx',
    meaning: 'The request needs credentials that were missing or rejected.',
    use: 'Sends a WWW-Authenticate challenge so the client can try again.',
  },
  {
    code: 402,
    name: 'Payment Required',
    className: '4xx',
    meaning: 'The request is refused until payment is arranged.',
    use: 'Reserved for paid APIs and billing gates; rarely used as intended.',
  },
  {
    code: 403,
    name: 'Forbidden',
    className: '4xx',
    meaning: 'The server understood the request but will not authorise it.',
    use: 'Answers a signed-in user who lacks the role for this resource.',
  },
  {
    code: 404,
    name: 'Not Found',
    className: '4xx',
    meaning: 'No resource matches the requested URL.',
    use: 'The default answer for an unknown path, or when access must not be revealed.',
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    className: '4xx',
    meaning: 'The URL exists but does not accept this HTTP method.',
    use: 'Answers a PUT to a read-only endpoint and lists the allowed methods.',
  },
  {
    code: 406,
    name: 'Not Acceptable',
    className: '4xx',
    meaning: 'No representation matches the Accept headers the client sent.',
    use: 'Refuses a request that will only take a format the server cannot produce.',
  },
  {
    code: 407,
    name: 'Proxy Authentication Required',
    className: '4xx',
    meaning: 'The client must authenticate with the proxy first.',
    use: 'Sent by a forward proxy that charges or restricts access.',
  },
  {
    code: 408,
    name: 'Request Timeout',
    className: '4xx',
    meaning: 'The server gave up waiting for the rest of the request.',
    use: 'Closes a connection whose client stalled mid-upload.',
  },
  {
    code: 409,
    name: 'Conflict',
    className: '4xx',
    meaning: 'The request clashes with the current state of the resource.',
    use: 'Answers an edit made against a version that has since changed.',
  },
  {
    code: 410,
    name: 'Gone',
    className: '4xx',
    meaning: 'The resource existed but has been removed on purpose.',
    use: 'Retires a deleted item so clients stop retrying and caches drop it.',
  },
  {
    code: 411,
    name: 'Length Required',
    className: '4xx',
    meaning: 'The request must state its body length.',
    use: 'Refuses a body sent without Content-Length when chunked encoding is off.',
  },
  {
    code: 412,
    name: 'Precondition Failed',
    className: '4xx',
    meaning: 'A condition in the request headers did not hold.',
    use: 'Rejects an If-Match update when the resource has moved on.',
  },
  {
    code: 413,
    name: 'Content Too Large',
    className: '4xx',
    meaning: 'The request body is larger than the server accepts.',
    use: 'Refuses an upload over the configured limit before reading it all.',
  },
  {
    code: 414,
    name: 'URI Too Long',
    className: '4xx',
    meaning: 'The requested URL is longer than the server will handle.',
    use: 'Catches query strings that should have been sent in a body.',
  },
  {
    code: 415,
    name: 'Unsupported Media Type',
    className: '4xx',
    meaning: 'The body is in a format the endpoint does not accept.',
    use: 'Refuses an XML payload on a JSON-only API.',
  },
  {
    code: 416,
    name: 'Range Not Satisfiable',
    className: '4xx',
    meaning: 'The requested byte range lies outside the resource.',
    use: 'Answers a resume request for a file that has since changed size.',
  },
  {
    code: 417,
    name: 'Expectation Failed',
    className: '4xx',
    meaning: 'The server cannot meet the Expect header of the request.',
    use: 'Refuses an Expect: 100-continue request the server will not honour.',
  },
  {
    code: 418,
    name: "I'm a Teapot",
    className: '4xx',
    meaning: 'The server is a teapot and cannot brew coffee, as an April Fools joke.',
    use: 'Kept as an in-joke and used by some test suites as an arbitrary code.',
  },
  {
    code: 421,
    name: 'Misdirected Request',
    className: '4xx',
    meaning: 'The connection reached a server that cannot answer for this host.',
    use: 'Sent when a reused TLS connection is wrong for the requested authority.',
  },
  {
    code: 422,
    name: 'Unprocessable Content',
    className: '4xx',
    meaning: 'The request is well formed but its instructions cannot be carried out.',
    use: 'Reports field-level validation failures on a JSON body.',
  },
  {
    code: 425,
    name: 'Too Early',
    className: '4xx',
    meaning: 'The server will not risk a replay of an early-data request.',
    use: 'Refuses TLS 1.3 0-RTT data when the request is not safe to repeat.',
  },
  {
    code: 426,
    name: 'Upgrade Required',
    className: '4xx',
    meaning: 'The client must switch to a newer protocol to continue.',
    use: 'Pushes a plain HTTP client towards TLS or HTTP/2.',
  },
  {
    code: 428,
    name: 'Precondition Required',
    className: '4xx',
    meaning: 'The server wants a conditional request so lost updates cannot happen.',
    use: 'Forces If-Match on writes to a shared record.',
  },
  {
    code: 429,
    name: 'Too Many Requests',
    className: '4xx',
    meaning: 'The client has sent too many requests in a given time.',
    use: 'Rate-limit answers, usually with Retry-After.',
  },
  {
    code: 431,
    name: 'Request Header Fields Too Large',
    className: '4xx',
    meaning: 'The request headers, singly or together, are too big.',
    use: 'Refuses oversized cookies before the server parses them.',
  },
  {
    code: 451,
    name: 'Unavailable For Legal Reasons',
    className: '4xx',
    meaning: 'The resource is withheld because serving it would break the law.',
    use: 'Blocks content under a court order or a regional sanction.',
  },
  {
    code: 500,
    name: 'Internal Server Error',
    className: '5xx',
    meaning: 'The server hit an unexpected condition it cannot recover from.',
    use: 'The catch-all answer when the handler throws and nothing better fits.',
  },
  {
    code: 501,
    name: 'Not Implemented',
    className: '5xx',
    meaning: 'The server does not support the method or feature the request needs.',
    use: 'Answers an HTTP method the server has deliberately left out.',
  },
  {
    code: 502,
    name: 'Bad Gateway',
    className: '5xx',
    meaning: 'A gateway or proxy received an invalid answer from upstream.',
    use: 'Reports a backend that returned nonsense or closed the connection.',
  },
  {
    code: 503,
    name: 'Service Unavailable',
    className: '5xx',
    meaning: 'The server cannot serve the request right now, usually temporarily.',
    use: 'Answers during maintenance or overload and may carry Retry-After.',
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    className: '5xx',
    meaning: 'A gateway or proxy did not get an answer from upstream in time.',
    use: 'Reports a backend that took longer than the proxy allows.',
  },
  {
    code: 505,
    name: 'HTTP Version Not Supported',
    className: '5xx',
    meaning: 'The server does not support the HTTP version in the request.',
    use: 'Refuses a version the server was never built to speak.',
  },
  {
    code: 506,
    name: 'Variant Also Negotiates',
    className: '5xx',
    meaning: 'Content negotiation is misconfigured and loops on itself.',
    use: 'A configuration bug in a server that negotiates variants.',
  },
  {
    code: 507,
    name: 'Insufficient Storage',
    className: '5xx',
    meaning: 'The server cannot store what the request needs to save.',
    use: 'Reports a full disk or quota during a WebDAV upload.',
  },
  {
    code: 508,
    name: 'Loop Detected',
    className: '5xx',
    meaning: 'The server found an endless loop while processing the request.',
    use: 'Stops a WebDAV request whose path keeps resolving to itself.',
  },
  {
    code: 510,
    name: 'Not Extended',
    className: '5xx',
    meaning: 'The server needs further extensions before it will answer.',
    use: 'The HTTP extension framework; almost never seen in practice.',
  },
  {
    code: 511,
    name: 'Network Authentication Required',
    className: '5xx',
    meaning: 'The client must sign in to a network, usually a captive portal.',
    use: 'Answers behind hotel or cafe Wi-Fi until the portal is completed.',
  },
];

const BY_CODE = new Map<number, HttpStatus>(HTTP_STATUSES.map((entry) => [entry.code, entry]));

export function findStatus(code: number): HttpStatus | undefined {
  return BY_CODE.get(code);
}

/**
 * Search by code ("404"), by name ("not found") or by words in the meaning and
 * use sentences. Every token must match somewhere, so "gateway timeout" narrows
 * instead of widening. An optional class filter is applied first.
 */
export function searchStatuses(
  query: string,
  filter: StatusClass | 'all' = 'all',
): readonly HttpStatus[] {
  const pool =
    filter === 'all' ? HTTP_STATUSES : HTTP_STATUSES.filter((entry) => entry.className === filter);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return pool;

  return pool.filter((entry) => {
    const words = `${entry.code} ${entry.name} ${entry.meaning} ${entry.use}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    // Word-prefix matching, so "gate" finds "gateway" but "not" does not match
    // the middle of "another".
    return tokens.every((token) => words.some((word) => word.startsWith(token)));
  });
}
