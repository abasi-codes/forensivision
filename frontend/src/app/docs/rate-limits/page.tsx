import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeBlock } from '@/components/docs/code-block';

export default function RateLimitsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Rate Limits</h1>
      <p className="text-lg text-muted-foreground mb-8">
        ForensiVision uses rate limiting to ensure fair usage and protect the API from abuse.
        Rate limits vary by plan and are enforced at the account level.
      </p>

      <AnchorHeading id="limits-by-plan" className="mt-10 mb-4">
        Rate Limits by Plan
      </AnchorHeading>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Plan</th>
              <th className="text-left py-2 font-medium">Requests/Min</th>
              <th className="text-left py-2 font-medium">Requests/Hour</th>
              <th className="text-left py-2 font-medium">Concurrent Jobs</th>
              <th className="text-left py-2 font-medium">Burst</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">Free</td>
              <td className="py-2 text-muted-foreground">20</td>
              <td className="py-2 text-muted-foreground">500</td>
              <td className="py-2 text-muted-foreground">5</td>
              <td className="py-2 text-muted-foreground">30</td>
            </tr>
            <tr>
              <td className="py-2">Pro</td>
              <td className="py-2 text-muted-foreground">60</td>
              <td className="py-2 text-muted-foreground">3,000</td>
              <td className="py-2 text-muted-foreground">20</td>
              <td className="py-2 text-muted-foreground">100</td>
            </tr>
            <tr>
              <td className="py-2">Enterprise</td>
              <td className="py-2 text-muted-foreground">300</td>
              <td className="py-2 text-muted-foreground">15,000</td>
              <td className="py-2 text-muted-foreground">100</td>
              <td className="py-2 text-muted-foreground">500</td>
            </tr>
            <tr>
              <td className="py-2">Custom</td>
              <td className="py-2 text-muted-foreground">Negotiated</td>
              <td className="py-2 text-muted-foreground">Negotiated</td>
              <td className="py-2 text-muted-foreground">Negotiated</td>
              <td className="py-2 text-muted-foreground">Negotiated</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="headers" className="mt-10 mb-4">
        Rate Limit Headers
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Every API response includes headers with your current rate limit status:
      </p>
      <CodeBlock
        language="http"
        code={`HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1706832060
X-RateLimit-Policy: 60;w=60`}
        className="mb-6"
      />

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Header</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-RateLimit-Limit</code></td>
              <td className="py-2 text-muted-foreground">Maximum requests per window</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-RateLimit-Remaining</code></td>
              <td className="py-2 text-muted-foreground">Remaining requests in current window</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-RateLimit-Reset</code></td>
              <td className="py-2 text-muted-foreground">Unix timestamp when window resets</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-RateLimit-Policy</code></td>
              <td className="py-2 text-muted-foreground">Policy description (limit;w=window_seconds)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Retry-After</code></td>
              <td className="py-2 text-muted-foreground">Seconds to wait before retrying (on 429)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="429-response" className="mt-10 mb-4">
        Rate Limit Exceeded (429)
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        When you exceed the rate limit, the API returns a 429 status code with details:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "type": "rate_limit_error",
    "details": {
      "limit": 60,
      "remaining": 0,
      "reset_at": "2026-02-02T12:01:00Z",
      "retry_after": 45
    }
  },
  "request_id": "req_abc123"
}`}
        className="mb-6"
      />

      <AnchorHeading id="handling" className="mt-10 mb-4">
        Handling Rate Limits
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Implement exponential backoff with jitter for graceful rate limit handling:
      </p>
      <CodeBlock
        language="javascript"
        code={`async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      // Get retry delay from header or calculate with backoff
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 60000);

      console.log(\`Rate limited. Retrying in \${delay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}`}
        className="mb-6"
      />

      <AnchorHeading id="best-practices" className="mt-10 mb-4">
        Best Practices
      </AnchorHeading>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li><strong>Monitor headers:</strong> Track remaining requests to proactively throttle</li>
        <li><strong>Use exponential backoff:</strong> Gradually increase delays on retries</li>
        <li><strong>Add jitter:</strong> Randomize retry delays to prevent thundering herd</li>
        <li><strong>Batch requests:</strong> Use batch endpoints to reduce request count</li>
        <li><strong>Cache results:</strong> Avoid re-analyzing identical content</li>
        <li><strong>Use webhooks:</strong> Replace polling with webhooks for async operations</li>
        <li><strong>Queue requests:</strong> Implement client-side rate limiting</li>
      </ul>

      <AnchorHeading id="concurrent-jobs" className="mt-10 mb-4">
        Concurrent Jobs
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The concurrent jobs limit restricts how many analyses can be in "processing" state
        simultaneously. If you reach this limit, new analysis requests will be queued until
        existing jobs complete.
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
          <strong>Tip:</strong> Use the <code>priority</code> parameter to ensure critical
          analyses are processed first when operating near capacity.
        </p>
      </div>

      <AnchorHeading id="burst" className="mt-10 mb-4">
        Burst Allowance
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The burst limit allows temporary spikes above your per-minute rate. This is useful
        for handling traffic bursts without immediately hitting rate limits. Once burst
        capacity is consumed, requests are limited to the standard per-minute rate until
        the burst bucket refills.
      </p>
    </div>
  );
}
