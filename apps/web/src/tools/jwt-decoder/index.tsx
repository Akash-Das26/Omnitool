import { type DecodedJwt, decodeJwt, JwtError } from '@omnitool/tool-core';
import { useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requireTool } from '@/lib/tool';

function JsonBlock({
  id,
  title,
  value,
}: {
  readonly id: string;
  readonly title: string;
  readonly value: unknown;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <pre
        id={id}
        className="max-h-80 overflow-auto rounded-control border border-border bg-surface-inset p-3 font-mono text-sm"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function JwtDecoderTool() {
  const tool = requireTool('jwt-decoder');
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decode() {
    try {
      setDecoded(decodeJwt(token));
      setError(null);
    } catch (cause) {
      setDecoded(null);
      setError(cause instanceof JwtError ? cause.message : 'That token could not be decoded');
    }
  }

  function clear() {
    setToken('');
    setDecoded(null);
    setError(null);
  }

  const output = decoded
    ? JSON.stringify({ header: decoded.header, payload: decoded.payload }, null, 2)
    : '';

  return (
    <ToolFrame tool={tool}>
      <div className="rounded-panel border border-border bg-surface">
        <ToolStage title="Token">
          <Label htmlFor="jwt-input">JSON Web Token</Label>
          <TextArea
            id="jwt-input"
            className="mt-2"
            rows={6}
            value={token}
            spellCheck={false}
            autoComplete="off"
            placeholder="Paste a signed JWT (three parts separated by dots)."
            onChange={(event) => setToken(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={decode} disabled={token.trim() === ''}>
              Decode
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clear}
              disabled={token === '' && !decoded}
            >
              Clear
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The token is decoded in this tab only. It is never sent anywhere, stored, or used to
            check the signature, and no keys are kept.
          </p>
        </ToolStage>

        <ToolStage title="Decoded">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {decoded ? (
            <div className="space-y-6">
              {decoded.claims.some((claim) => claim.expired === true) ? (
                <p role="status" className="text-sm font-medium text-destructive">
                  {decoded.claims.some((claim) => claim.key === 'exp' && claim.expired)
                    ? 'This token has expired. The signature is still not verified.'
                    : 'This token is not valid yet (nbf is in the future).'}
                </p>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <JsonBlock id="jwt-header" title="Header" value={decoded.header} />
                <JsonBlock id="jwt-payload" title="Payload" value={decoded.payload} />
              </div>

              {decoded.claims.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <caption className="sr-only">Registered claims</caption>
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Claim
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Value
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {decoded.claims.map((claim) => (
                        <tr key={claim.key} className="border-b border-border/60 align-top">
                          <th scope="row" className="py-2 pr-4 text-left font-normal">
                            {claim.label}{' '}
                            <span className="font-mono text-muted-foreground">({claim.key})</span>
                          </th>
                          <td className="py-2 pr-4 font-mono break-all">
                            {typeof claim.value === 'string'
                              ? claim.value
                              : JSON.stringify(claim.value)}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {claim.time ?? '—'}
                            {claim.expired === true ? (
                              <span className="ml-2 font-medium text-destructive">
                                {claim.key === 'exp' ? 'expired' : 'not yet valid'}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-medium">Signature</h3>
                <p className="font-mono text-sm break-all text-muted-foreground">
                  {decoded.signature === '' ? '(unsigned token)' : decoded.signature}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Not verified: this tool has no key and makes no requests.
                </p>
              </div>

              <OutputActions text={output} filename="jwt-decoded.json" mime="application/json" />
            </div>
          ) : null}

          {!decoded && !error ? (
            <p className="text-sm text-muted-foreground">
              Paste a token and choose Decode to see its header and claims.
            </p>
          ) : null}
        </ToolStage>
      </div>
    </ToolFrame>
  );
}
