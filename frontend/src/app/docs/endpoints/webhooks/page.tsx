import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function WebhooksEndpointPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Webhooks API</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage webhook endpoints for receiving real-time notifications about analysis events.
      </p>

      <AnchorHeading id="create-webhook" className="mt-10 mb-4">
        Create Webhook
      </AnchorHeading>

      <EndpointHeader
        method="POST"
        path="/v1/webhooks"
        description="Register a new webhook endpoint to receive event notifications."
      />

      <ParamTable
        title="Request Body"
        parameters={[
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'HTTPS URL to receive webhook events.',
          },
          {
            name: 'events',
            type: 'string[]',
            required: true,
            description: 'Events to subscribe to.',
          },
          {
            name: 'description',
            type: 'string',
            description: 'Human-readable description for this webhook.',
          },
          {
            name: 'active',
            type: 'boolean',
            description: 'Whether the webhook is active.',
            default: 'true',
          },
        ]}
      />

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://api.forensivision.com/v1/webhooks \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/forensivision",
    "events": ["analysis.completed", "analysis.failed", "batch.completed"],
    "description": "Production webhook for content moderation"
  }'`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/forensivision',
    events: ['analysis.completed', 'analysis.failed', 'batch.completed'],
    description: 'Production webhook for content moderation',
  }),
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/webhooks',
    headers={
        'Authorization': 'Bearer fv_live_sk_...',
        'Content-Type': 'application/json',
    },
    json={
        'url': 'https://yourapp.com/webhooks/forensivision',
        'events': ['analysis.completed', 'analysis.failed', 'batch.completed'],
        'description': 'Production webhook for content moderation',
    },
)`,
          },
        ]}
        className="mb-6"
      />

      <h3 className="text-lg font-semibold mt-6 mb-3">Response</h3>
      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "webhook_abc123",
    "type": "webhook",
    "attributes": {
      "url": "https://yourapp.com/webhooks/forensivision",
      "events": ["analysis.completed", "analysis.failed", "batch.completed"],
      "description": "Production webhook for content moderation",
      "active": true,
      "secret": "whsec_abc123def456...",
      "created_at": "2026-02-02T10:30:00Z"
    }
  }
}`}
        className="mb-6"
      />

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 m-0">
          <strong>Important:</strong> The <code>secret</code> is only returned once when creating the webhook.
          Store it securely for signature verification.
        </p>
      </div>

      <AnchorHeading id="list-webhooks" className="mt-10 mb-4">
        List Webhooks
      </AnchorHeading>

      <EndpointHeader
        method="GET"
        path="/v1/webhooks"
        description="List all registered webhook endpoints."
      />

      <CodeBlock
        language="json"
        code={`{
  "data": [
    {
      "id": "webhook_abc123",
      "type": "webhook",
      "attributes": {
        "url": "https://yourapp.com/webhooks/forensivision",
        "events": ["analysis.completed", "analysis.failed"],
        "active": true,
        "created_at": "2026-02-02T10:30:00Z",
        "last_triggered_at": "2026-02-02T14:22:00Z",
        "delivery_stats": {
          "total_attempts": 156,
          "successful": 154,
          "failed": 2
        }
      }
    }
  ]
}`}
        className="mb-6"
      />

      <AnchorHeading id="delete-webhook" className="mt-10 mb-4">
        Delete Webhook
      </AnchorHeading>

      <EndpointHeader
        method="DELETE"
        path="/v1/webhooks/{id}"
        description="Remove a webhook registration. Events will no longer be delivered."
      />

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X DELETE https://api.forensivision.com/v1/webhooks/webhook_abc123 \\
  -H "Authorization: Bearer fv_live_sk_..."`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `await fetch('https://api.forensivision.com/v1/webhooks/webhook_abc123', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
  },
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

requests.delete(
    'https://api.forensivision.com/v1/webhooks/webhook_abc123',
    headers={'Authorization': 'Bearer fv_live_sk_...'},
)`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="event-types" className="mt-10 mb-4">
        Event Types
      </AnchorHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Event</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analysis.created</code></td>
              <td className="py-2 text-muted-foreground">Analysis job created and queued</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analysis.progress</code></td>
              <td className="py-2 text-muted-foreground">Progress update for long-running analysis</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analysis.completed</code></td>
              <td className="py-2 text-muted-foreground">Analysis completed successfully</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analysis.failed</code></td>
              <td className="py-2 text-muted-foreground">Analysis failed with an error</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">batch.item_completed</code></td>
              <td className="py-2 text-muted-foreground">Single item in batch completed</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">batch.completed</code></td>
              <td className="py-2 text-muted-foreground">All items in batch completed</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">quota.warning</code></td>
              <td className="py-2 text-muted-foreground">Usage exceeded 80% of quota</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">quota.exceeded</code></td>
              <td className="py-2 text-muted-foreground">Monthly quota exhausted</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
