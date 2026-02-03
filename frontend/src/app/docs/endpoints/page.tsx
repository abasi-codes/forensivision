import Link from 'next/link';
import { AnchorHeading } from '@/components/docs/anchor-heading';

const endpoints = [
  {
    category: 'Analysis',
    items: [
      { method: 'POST', path: '/v1/analyze/image', title: 'Analyze Image', href: '/docs/endpoints/analyze-image', description: 'Analyze a single image for AI-generated content' },
      { method: 'POST', path: '/v1/analyze/video', title: 'Analyze Video', href: '/docs/endpoints/analyze-video', description: 'Analyze a video for deepfakes and manipulation' },
      { method: 'POST', path: '/v1/analyze/batch', title: 'Batch Analysis', href: '/docs/endpoints/analyze-batch', description: 'Submit multiple files for batch processing' },
      { method: 'POST', path: '/v1/analysis/{id}/cancel', title: 'Cancel Analysis', href: '/docs/endpoints/cancel', description: 'Cancel a pending or in-progress analysis' },
    ],
  },
  {
    category: 'Results',
    items: [
      { method: 'GET', path: '/v1/results/{id}', title: 'Get Results', href: '/docs/endpoints/results', description: 'Retrieve analysis results by ID' },
      { method: 'GET', path: '/v1/results', title: 'List Results', href: '/docs/endpoints/results', description: 'List all analysis results with pagination' },
    ],
  },
  {
    category: 'Account',
    items: [
      { method: 'GET', path: '/v1/usage', title: 'Get Usage', href: '/docs/endpoints/usage', description: 'Retrieve current usage statistics' },
      { method: 'GET', path: '/v1/models', title: 'List Models', href: '/docs/endpoints/models', description: 'List available detection models' },
    ],
  },
  {
    category: 'Webhooks',
    items: [
      { method: 'POST', path: '/v1/webhooks', title: 'Create Webhook', href: '/docs/endpoints/webhooks', description: 'Register a new webhook endpoint' },
      { method: 'GET', path: '/v1/webhooks', title: 'List Webhooks', href: '/docs/endpoints/webhooks', description: 'List all registered webhooks' },
      { method: 'DELETE', path: '/v1/webhooks/{id}', title: 'Delete Webhook', href: '/docs/endpoints/webhooks', description: 'Remove a webhook registration' },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function EndpointsOverviewPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">API Reference</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Complete reference documentation for all ForensiVision API endpoints. All endpoints
        use the base URL <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">https://api.forensivision.com/v1</code>.
      </p>

      {endpoints.map((category) => (
        <div key={category.category} className="mb-10">
          <AnchorHeading as="h2" id={category.category.toLowerCase()} className="mb-4">
            {category.category}
          </AnchorHeading>
          <div className="space-y-3">
            {category.items.map((endpoint) => (
              <Link
                key={endpoint.path + endpoint.method}
                href={endpoint.href}
                className="block border rounded-lg p-4 hover:border-primary transition-colors no-underline"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${methodColors[endpoint.method]}`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground m-0">{endpoint.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <AnchorHeading as="h2" id="response-format" className="mt-10 mb-4">
        Response Format
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        All API responses follow the JSON:API specification with consistent structure:
      </p>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">data</code> - The primary resource or array of resources</li>
        <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">meta</code> - Metadata including request ID and timing</li>
        <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">error</code> - Error details when request fails</li>
        <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">pagination</code> - Cursor-based pagination for list endpoints</li>
      </ul>

      <AnchorHeading as="h2" id="common-headers" className="mt-10 mb-4">
        Common Headers
      </AnchorHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Header</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Authorization</code></td>
              <td className="py-2 text-muted-foreground">Bearer token for authentication (required)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Content-Type</code></td>
              <td className="py-2 text-muted-foreground">application/json for JSON requests</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-Request-ID</code></td>
              <td className="py-2 text-muted-foreground">Optional client-provided request ID for tracing</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Idempotency-Key</code></td>
              <td className="py-2 text-muted-foreground">Unique key for idempotent POST requests</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
