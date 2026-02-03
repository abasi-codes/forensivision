import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeBlock } from '@/components/docs/code-block';

export default function ErrorsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Error Handling</h1>
      <p className="text-lg text-muted-foreground mb-8">
        ForensiVision uses conventional HTTP status codes and returns detailed error responses
        to help you diagnose and handle issues.
      </p>

      <AnchorHeading id="error-format" className="mt-10 mb-4">
        Error Response Format
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        All errors follow a consistent JSON structure:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid parameters.",
    "type": "invalid_request_error",
    "details": [
      {
        "field": "source.url",
        "code": "INVALID_URL",
        "message": "The provided URL is not accessible or returns an error."
      }
    ],
    "documentation_url": "https://docs.forensivision.com/errors/validation-error"
  },
  "request_id": "req_abc123"
}`}
        className="mb-6"
      />

      <AnchorHeading id="http-status-codes" className="mt-10 mb-4">
        HTTP Status Codes
      </AnchorHeading>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2 text-green-600 font-medium">2xx</td>
              <td className="py-2 text-muted-foreground">Success</td>
            </tr>
            <tr>
              <td className="py-2">200 OK</td>
              <td className="py-2 text-muted-foreground">Request succeeded</td>
            </tr>
            <tr>
              <td className="py-2">201 Created</td>
              <td className="py-2 text-muted-foreground">Resource created successfully</td>
            </tr>
            <tr>
              <td className="py-2">202 Accepted</td>
              <td className="py-2 text-muted-foreground">Request accepted for async processing</td>
            </tr>
            <tr>
              <td className="py-2">204 No Content</td>
              <td className="py-2 text-muted-foreground">Success with no response body</td>
            </tr>
            <tr>
              <td className="py-2 text-yellow-600 font-medium">4xx</td>
              <td className="py-2 text-muted-foreground">Client Error</td>
            </tr>
            <tr>
              <td className="py-2">400 Bad Request</td>
              <td className="py-2 text-muted-foreground">Invalid request parameters</td>
            </tr>
            <tr>
              <td className="py-2">401 Unauthorized</td>
              <td className="py-2 text-muted-foreground">Missing or invalid authentication</td>
            </tr>
            <tr>
              <td className="py-2">402 Payment Required</td>
              <td className="py-2 text-muted-foreground">Quota exceeded or payment required</td>
            </tr>
            <tr>
              <td className="py-2">403 Forbidden</td>
              <td className="py-2 text-muted-foreground">Insufficient permissions</td>
            </tr>
            <tr>
              <td className="py-2">404 Not Found</td>
              <td className="py-2 text-muted-foreground">Resource not found</td>
            </tr>
            <tr>
              <td className="py-2">409 Conflict</td>
              <td className="py-2 text-muted-foreground">Request conflicts with current state</td>
            </tr>
            <tr>
              <td className="py-2">413 Payload Too Large</td>
              <td className="py-2 text-muted-foreground">File exceeds size limits</td>
            </tr>
            <tr>
              <td className="py-2">415 Unsupported Media Type</td>
              <td className="py-2 text-muted-foreground">File format not supported</td>
            </tr>
            <tr>
              <td className="py-2">422 Unprocessable Entity</td>
              <td className="py-2 text-muted-foreground">Valid syntax but invalid semantics</td>
            </tr>
            <tr>
              <td className="py-2">429 Too Many Requests</td>
              <td className="py-2 text-muted-foreground">Rate limit exceeded</td>
            </tr>
            <tr>
              <td className="py-2 text-red-600 font-medium">5xx</td>
              <td className="py-2 text-muted-foreground">Server Error</td>
            </tr>
            <tr>
              <td className="py-2">500 Internal Server Error</td>
              <td className="py-2 text-muted-foreground">Unexpected server error</td>
            </tr>
            <tr>
              <td className="py-2">502 Bad Gateway</td>
              <td className="py-2 text-muted-foreground">Upstream service error</td>
            </tr>
            <tr>
              <td className="py-2">503 Service Unavailable</td>
              <td className="py-2 text-muted-foreground">Service temporarily unavailable</td>
            </tr>
            <tr>
              <td className="py-2">504 Gateway Timeout</td>
              <td className="py-2 text-muted-foreground">Request timed out</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="error-codes" className="mt-10 mb-4">
        Error Codes Reference
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Error codes are grouped by category (first digit):
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Authentication Errors (1xxx)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">1001</code></td>
              <td className="py-2">UNAUTHORIZED</td>
              <td className="py-2 text-muted-foreground">Missing or invalid API key</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">1002</code></td>
              <td className="py-2">TOKEN_EXPIRED</td>
              <td className="py-2 text-muted-foreground">JWT access token has expired</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">1003</code></td>
              <td className="py-2">INVALID_SCOPE</td>
              <td className="py-2 text-muted-foreground">Token lacks required scope</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">1004</code></td>
              <td className="py-2">API_KEY_REVOKED</td>
              <td className="py-2 text-muted-foreground">API key has been revoked</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Validation Errors (2xxx)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">2001</code></td>
              <td className="py-2">VALIDATION_ERROR</td>
              <td className="py-2 text-muted-foreground">Request body validation failed</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">2002</code></td>
              <td className="py-2">INVALID_URL</td>
              <td className="py-2 text-muted-foreground">Provided URL is invalid or inaccessible</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">2003</code></td>
              <td className="py-2">MISSING_FIELD</td>
              <td className="py-2 text-muted-foreground">Required field is missing</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">2004</code></td>
              <td className="py-2">INVALID_FORMAT</td>
              <td className="py-2 text-muted-foreground">Field has invalid format</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Rate Limit Errors (3xxx)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">3001</code></td>
              <td className="py-2">RATE_LIMIT_EXCEEDED</td>
              <td className="py-2 text-muted-foreground">Too many requests per minute</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">3002</code></td>
              <td className="py-2">QUOTA_EXCEEDED</td>
              <td className="py-2 text-muted-foreground">Monthly analysis quota reached</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">3003</code></td>
              <td className="py-2">CONCURRENT_LIMIT</td>
              <td className="py-2 text-muted-foreground">Too many concurrent analyses</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Resource Errors (4xxx)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">4001</code></td>
              <td className="py-2">NOT_FOUND</td>
              <td className="py-2 text-muted-foreground">Resource does not exist</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">4002</code></td>
              <td className="py-2">FILE_TOO_LARGE</td>
              <td className="py-2 text-muted-foreground">File exceeds maximum size</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">4003</code></td>
              <td className="py-2">UNSUPPORTED_FORMAT</td>
              <td className="py-2 text-muted-foreground">File type not supported</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">4004</code></td>
              <td className="py-2">UPLOAD_EXPIRED</td>
              <td className="py-2 text-muted-foreground">Presigned upload URL has expired</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Processing Errors (5xxx)</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">5001</code></td>
              <td className="py-2">PROCESSING_FAILED</td>
              <td className="py-2 text-muted-foreground">Analysis failed during processing</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">5002</code></td>
              <td className="py-2">CORRUPTED_FILE</td>
              <td className="py-2 text-muted-foreground">File is corrupted or unreadable</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">5003</code></td>
              <td className="py-2">MODEL_ERROR</td>
              <td className="py-2 text-muted-foreground">Detection model encountered an error</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">5004</code></td>
              <td className="py-2">TIMEOUT</td>
              <td className="py-2 text-muted-foreground">Analysis exceeded time limit</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="handling-errors" className="mt-10 mb-4">
        Error Handling Example
      </AnchorHeading>
      <CodeBlock
        language="javascript"
        code={`async function analyzeImage(imageUrl) {
  try {
    const response = await fetch('https://api.forensivision.com/v1/analyze/image', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: { type: 'url', url: imageUrl } }),
    });

    if (!response.ok) {
      const error = await response.json();

      switch (error.error.code) {
        case 'RATE_LIMIT_EXCEEDED':
          // Wait and retry
          const retryAfter = error.error.details.retry_after;
          await sleep(retryAfter * 1000);
          return analyzeImage(imageUrl);

        case 'QUOTA_EXCEEDED':
          // Notify user to upgrade plan
          throw new QuotaError('Monthly quota exceeded');

        case 'INVALID_URL':
          // Handle invalid URL
          throw new ValidationError('The image URL is not accessible');

        default:
          throw new Error(error.error.message);
      }
    }

    return response.json();
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}`}
        className="mb-6"
      />
    </div>
  );
}
