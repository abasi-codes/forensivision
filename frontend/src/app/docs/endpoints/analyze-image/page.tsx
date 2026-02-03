import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function AnalyzeImagePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Analyze Image</h1>

      <EndpointHeader
        method="POST"
        path="/v1/analyze/image"
        description="Analyze a single image for AI-generated content, deepfakes, and manipulation."
      />

      <AnchorHeading id="request-body" className="mt-10 mb-4">
        Request Body
      </AnchorHeading>

      <ParamTable
        title="Source (required)"
        parameters={[
          {
            name: 'source.type',
            type: 'string',
            required: true,
            description: 'Source type: "url" for remote images or "upload" for presigned uploads',
          },
          {
            name: 'source.url',
            type: 'string',
            description: 'URL of the image to analyze. Required when type is "url".',
          },
          {
            name: 'source.upload_id',
            type: 'string',
            description: 'Upload ID from presigned upload flow. Required when type is "upload".',
          },
        ]}
      />

      <ParamTable
        title="Options (optional)"
        parameters={[
          {
            name: 'options.models',
            type: 'string[]',
            description: 'Detection models to use. Defaults to all available models.',
            default: '["deepfake_v3", "gan_detector_v2", "diffusion_v1"]',
          },
          {
            name: 'options.detail_level',
            type: 'string',
            description: 'Level of detail in results: "basic", "standard", or "comprehensive".',
            default: '"standard"',
          },
          {
            name: 'options.include_heatmap',
            type: 'boolean',
            description: 'Generate visual heatmap of suspicious regions.',
            default: 'false',
          },
          {
            name: 'options.include_metadata',
            type: 'boolean',
            description: 'Include EXIF and forensic metadata analysis.',
            default: 'true',
          },
        ]}
      />

      <ParamTable
        title="Webhook (optional)"
        parameters={[
          {
            name: 'webhook.url',
            type: 'string',
            description: 'URL to receive webhook notifications.',
          },
          {
            name: 'webhook.secret',
            type: 'string',
            description: 'Secret for webhook signature verification.',
          },
          {
            name: 'webhook.events',
            type: 'string[]',
            description: 'Events to receive: "analysis.completed", "analysis.failed".',
          },
        ]}
      />

      <ParamTable
        title="Metadata (optional)"
        parameters={[
          {
            name: 'metadata.external_id',
            type: 'string',
            description: 'Your internal reference ID for this analysis.',
          },
          {
            name: 'metadata.tags',
            type: 'string[]',
            description: 'Custom tags for filtering and organization.',
          },
        ]}
      />

      <AnchorHeading id="request-examples" className="mt-10 mb-4">
        Request Examples
      </AnchorHeading>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://api.forensivision.com/v1/analyze/image \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: unique-request-id-123" \\
  -d '{
    "source": {
      "type": "url",
      "url": "https://example.com/image.jpg"
    },
    "options": {
      "models": ["deepfake_v3", "gan_detector_v2", "diffusion_v1"],
      "detail_level": "comprehensive",
      "include_heatmap": true
    },
    "webhook": {
      "url": "https://yourapp.com/webhooks/forensivision",
      "events": ["analysis.completed", "analysis.failed"]
    },
    "metadata": {
      "external_id": "user-upload-123",
      "tags": ["profile_photo", "verification"]
    }
  }'`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/analyze/image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
    'Content-Type': 'application/json',
    'Idempotency-Key': 'unique-request-id-123',
  },
  body: JSON.stringify({
    source: {
      type: 'url',
      url: 'https://example.com/image.jpg',
    },
    options: {
      models: ['deepfake_v3', 'gan_detector_v2', 'diffusion_v1'],
      detail_level: 'comprehensive',
      include_heatmap: true,
    },
    webhook: {
      url: 'https://yourapp.com/webhooks/forensivision',
      events: ['analysis.completed', 'analysis.failed'],
    },
    metadata: {
      external_id: 'user-upload-123',
      tags: ['profile_photo', 'verification'],
    },
  }),
});

const data = await response.json();`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/analyze/image',
    headers={
        'Authorization': 'Bearer fv_live_sk_...',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'unique-request-id-123',
    },
    json={
        'source': {
            'type': 'url',
            'url': 'https://example.com/image.jpg',
        },
        'options': {
            'models': ['deepfake_v3', 'gan_detector_v2', 'diffusion_v1'],
            'detail_level': 'comprehensive',
            'include_heatmap': True,
        },
        'webhook': {
            'url': 'https://yourapp.com/webhooks/forensivision',
            'events': ['analysis.completed', 'analysis.failed'],
        },
        'metadata': {
            'external_id': 'user-upload-123',
            'tags': ['profile_photo', 'verification'],
        },
    },
)

data = response.json()`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="response" className="mt-10 mb-4">
        Response
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The response varies based on whether the analysis completes synchronously (small files)
        or asynchronously (larger files or when using webhooks).
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Async Response (202 Accepted)</h3>
      <p className="text-muted-foreground mb-4">
        For larger files, the API returns immediately with a pending status:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "processing",
      "progress": 0,
      "estimated_completion": "2026-02-02T10:31:00Z",
      "created_at": "2026-02-02T10:30:00Z",
      "file": {
        "name": "image.jpg",
        "size_bytes": 2048576,
        "mime_type": "image/jpeg",
        "dimensions": { "width": 1920, "height": 1080 }
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_img_abc123",
      "cancel": "/v1/analysis/analysis_img_abc123/cancel"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "idempotency_key": "unique-request-id-123"
  }
}`}
        className="mb-6"
      />

      <h3 className="text-lg font-semibold mt-6 mb-3">Sync Response (200 OK)</h3>
      <p className="text-muted-foreground mb-4">
        For small files with <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">sync=true</code>,
        results are returned immediately:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "completed",
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:12Z",
      "file": {
        "name": "image.jpg",
        "size_bytes": 524288,
        "mime_type": "image/jpeg"
      },
      "results": {
        "verdict": "ai_generated",
        "confidence": 0.94,
        "risk_level": "high",
        "summary": "This image shows strong indicators of AI generation, likely from a diffusion-based model.",
        "detections": [
          {
            "model": "deepfake_v3",
            "verdict": "ai_generated",
            "confidence": 0.92,
            "details": {
              "generation_type": "full_synthetic",
              "likely_source": "stable_diffusion",
              "artifacts_detected": ["texture_inconsistency", "lighting_anomaly"]
            }
          },
          {
            "model": "gan_detector_v2",
            "verdict": "ai_generated",
            "confidence": 0.89,
            "details": {
              "frequency_analysis": "abnormal",
              "noise_pattern": "synthetic"
            }
          }
        ],
        "ensemble_score": 0.94,
        "heatmap_url": "https://results.forensivision.com/heatmaps/abc123.png"
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_img_abc123",
      "results": "/v1/results/analysis_img_abc123",
      "export_pdf": "/v1/results/analysis_img_abc123/export?format=pdf"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "processing_time_ms": 12340
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="errors" className="mt-10 mb-4">
        Errors
      </AnchorHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Status</th>
              <th className="text-left py-2 font-medium">Code</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">400</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">VALIDATION_ERROR</code></td>
              <td className="py-2 text-muted-foreground">Invalid request parameters</td>
            </tr>
            <tr>
              <td className="py-2">401</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">UNAUTHORIZED</code></td>
              <td className="py-2 text-muted-foreground">Invalid or missing API key</td>
            </tr>
            <tr>
              <td className="py-2">402</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">QUOTA_EXCEEDED</code></td>
              <td className="py-2 text-muted-foreground">Monthly analysis quota reached</td>
            </tr>
            <tr>
              <td className="py-2">413</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">FILE_TOO_LARGE</code></td>
              <td className="py-2 text-muted-foreground">Image exceeds 25MB limit</td>
            </tr>
            <tr>
              <td className="py-2">415</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">UNSUPPORTED_FORMAT</code></td>
              <td className="py-2 text-muted-foreground">File format not supported</td>
            </tr>
            <tr>
              <td className="py-2">429</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">RATE_LIMIT_EXCEEDED</code></td>
              <td className="py-2 text-muted-foreground">Too many requests</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
