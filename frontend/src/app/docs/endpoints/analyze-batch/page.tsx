import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function AnalyzeBatchPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Batch Analysis</h1>

      <EndpointHeader
        method="POST"
        path="/v1/analyze/batch"
        description="Submit multiple files for batch analysis. Ideal for content moderation pipelines and bulk verification."
      />

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
          <strong>Enterprise only.</strong> Batch analysis with 100+ files requires an Enterprise plan.
          Pro users can submit batches of up to 10 files.
        </p>
      </div>

      <AnchorHeading id="request-body" className="mt-10 mb-4">
        Request Body
      </AnchorHeading>

      <ParamTable
        title="Items (required)"
        parameters={[
          {
            name: 'items',
            type: 'array',
            required: true,
            description: 'Array of items to analyze (max 100 for Pro, unlimited for Enterprise).',
          },
          {
            name: 'items[].id',
            type: 'string',
            required: true,
            description: 'Unique identifier for this item within the batch.',
          },
          {
            name: 'items[].type',
            type: 'string',
            required: true,
            description: '"image" or "video".',
          },
          {
            name: 'items[].source',
            type: 'object',
            required: true,
            description: 'Source configuration with type and url/upload_id.',
          },
        ]}
      />

      <ParamTable
        title="Options (optional)"
        parameters={[
          {
            name: 'options.default_models',
            type: 'string[]',
            description: 'Default models to use for all items.',
          },
          {
            name: 'options.parallel_limit',
            type: 'number',
            description: 'Maximum concurrent analyses. Higher values process faster but use more quota.',
            default: '10',
          },
          {
            name: 'options.stop_on_failure',
            type: 'boolean',
            description: 'Stop processing if any item fails.',
            default: 'false',
          },
        ]}
      />

      <AnchorHeading id="request-example" className="mt-10 mb-4">
        Request Example
      </AnchorHeading>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://api.forensivision.com/v1/analyze/batch \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "id": "item_1",
        "type": "image",
        "source": { "type": "url", "url": "https://example.com/image1.jpg" }
      },
      {
        "id": "item_2",
        "type": "image",
        "source": { "type": "url", "url": "https://example.com/image2.png" }
      },
      {
        "id": "item_3",
        "type": "video",
        "source": { "type": "upload", "upload_id": "upload_xyz789" }
      }
    ],
    "options": {
      "default_models": ["deepfake_v3", "gan_detector_v2"],
      "parallel_limit": 10,
      "stop_on_failure": false
    },
    "webhook": {
      "url": "https://yourapp.com/webhooks/forensivision",
      "events": ["batch.item_completed", "batch.completed", "batch.failed"]
    },
    "metadata": {
      "batch_name": "Content moderation queue - Feb 2",
      "external_id": "batch-2026-02-02-001"
    }
  }'`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/analyze/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [
      { id: 'item_1', type: 'image', source: { type: 'url', url: 'https://example.com/image1.jpg' } },
      { id: 'item_2', type: 'image', source: { type: 'url', url: 'https://example.com/image2.png' } },
      { id: 'item_3', type: 'video', source: { type: 'upload', upload_id: 'upload_xyz789' } },
    ],
    options: {
      default_models: ['deepfake_v3', 'gan_detector_v2'],
      parallel_limit: 10,
      stop_on_failure: false,
    },
    webhook: {
      url: 'https://yourapp.com/webhooks/forensivision',
      events: ['batch.item_completed', 'batch.completed'],
    },
  }),
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/analyze/batch',
    headers={
        'Authorization': 'Bearer fv_live_sk_...',
        'Content-Type': 'application/json',
    },
    json={
        'items': [
            {'id': 'item_1', 'type': 'image', 'source': {'type': 'url', 'url': 'https://example.com/image1.jpg'}},
            {'id': 'item_2', 'type': 'image', 'source': {'type': 'url', 'url': 'https://example.com/image2.png'}},
            {'id': 'item_3', 'type': 'video', 'source': {'type': 'upload', 'upload_id': 'upload_xyz789'}},
        ],
        'options': {
            'default_models': ['deepfake_v3', 'gan_detector_v2'],
            'parallel_limit': 10,
            'stop_on_failure': False,
        },
        'webhook': {
            'url': 'https://yourapp.com/webhooks/forensivision',
            'events': ['batch.item_completed', 'batch.completed'],
        },
    },
)`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="response" className="mt-10 mb-4">
        Response
      </AnchorHeading>

      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "batch_ghi789",
    "type": "batch_analysis",
    "attributes": {
      "status": "processing",
      "progress": {
        "total": 3,
        "completed": 0,
        "failed": 0,
        "processing": 2,
        "pending": 1
      },
      "items": [
        { "id": "item_1", "analysis_id": "analysis_img_abc123", "status": "processing" },
        { "id": "item_2", "analysis_id": "analysis_img_def456", "status": "processing" },
        { "id": "item_3", "analysis_id": "analysis_vid_ghi789", "status": "pending" }
      ],
      "created_at": "2026-02-02T10:30:00Z",
      "estimated_completion": "2026-02-02T10:45:00Z"
    },
    "links": {
      "self": "/v1/batch/batch_ghi789",
      "results": "/v1/batch/batch_ghi789/results"
    }
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="webhook-events" className="mt-10 mb-4">
        Batch Webhook Events
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
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">batch.item_completed</code></td>
              <td className="py-2 text-muted-foreground">Fired when a single item in the batch completes</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">batch.completed</code></td>
              <td className="py-2 text-muted-foreground">Fired when all items in the batch complete</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">batch.failed</code></td>
              <td className="py-2 text-muted-foreground">Fired if the batch fails (with stop_on_failure)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
