import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function ResultsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Get Results</h1>

      <EndpointHeader
        method="GET"
        path="/v1/results/{id}"
        description="Retrieve detailed analysis results by ID."
      />

      <AnchorHeading id="path-parameters" className="mt-10 mb-4">
        Path Parameters
      </AnchorHeading>
      <ParamTable
        parameters={[
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'The analysis ID (e.g., analysis_img_abc123).',
          },
        ]}
      />

      <AnchorHeading id="query-parameters" className="mt-10 mb-4">
        Query Parameters
      </AnchorHeading>
      <ParamTable
        parameters={[
          {
            name: 'include',
            type: 'string',
            description: 'Comma-separated list of related resources to include: "heatmap", "metadata", "detections".',
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
            code: `curl https://api.forensivision.com/v1/results/analysis_img_abc123?include=heatmap,metadata \\
  -H "Authorization: Bearer fv_live_sk_..."`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch(
  'https://api.forensivision.com/v1/results/analysis_img_abc123?include=heatmap,metadata',
  {
    headers: {
      'Authorization': 'Bearer fv_live_sk_...',
    },
  }
);

const data = await response.json();`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.get(
    'https://api.forensivision.com/v1/results/analysis_img_abc123',
    params={'include': 'heatmap,metadata'},
    headers={'Authorization': 'Bearer fv_live_sk_...'},
)

data = response.json()`,
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
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "completed",
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:12Z",
      "file": {
        "name": "image.jpg",
        "size_bytes": 524288,
        "mime_type": "image/jpeg",
        "dimensions": { "width": 1920, "height": 1080 }
      },
      "results": {
        "verdict": "ai_generated",
        "confidence": 0.94,
        "risk_level": "high",
        "summary": "This image shows strong indicators of AI generation.",
        "detections": [
          {
            "model": "deepfake_v3",
            "verdict": "ai_generated",
            "confidence": 0.92,
            "details": {
              "generation_type": "full_synthetic",
              "likely_source": "stable_diffusion"
            }
          }
        ],
        "ensemble_score": 0.94
      },
      "heatmap": {
        "url": "https://results.forensivision.com/heatmaps/abc123.png",
        "expires_at": "2026-02-09T10:30:00Z"
      },
      "metadata": {
        "exif": {
          "software": null,
          "camera_make": null,
          "creation_date": null
        },
        "forensic": {
          "jpeg_quality": 85,
          "compression_artifacts": "minimal"
        }
      }
    },
    "links": {
      "self": "/v1/results/analysis_img_abc123",
      "export_pdf": "/v1/results/analysis_img_abc123/export?format=pdf",
      "export_json": "/v1/results/analysis_img_abc123/export?format=json"
    }
  },
  "meta": {
    "request_id": "req_xyz789"
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="list-results" className="mt-10 mb-4">
        List Results
      </AnchorHeading>

      <EndpointHeader
        method="GET"
        path="/v1/results"
        description="List all analysis results with cursor-based pagination."
      />

      <ParamTable
        title="Query Parameters"
        parameters={[
          {
            name: 'limit',
            type: 'number',
            description: 'Number of results to return (max 100).',
            default: '20',
          },
          {
            name: 'cursor',
            type: 'string',
            description: 'Pagination cursor from previous response.',
          },
          {
            name: 'status',
            type: 'string',
            description: 'Filter by status: "pending", "processing", "completed", "failed".',
          },
          {
            name: 'verdict',
            type: 'string',
            description: 'Filter by verdict: "authentic", "ai_generated", "manipulated", "inconclusive".',
          },
          {
            name: 'from',
            type: 'string',
            description: 'ISO 8601 date to filter results created after.',
          },
          {
            name: 'to',
            type: 'string',
            description: 'ISO 8601 date to filter results created before.',
          },
        ]}
      />

      <CodeBlock
        language="json"
        code={`{
  "data": [
    {
      "id": "analysis_img_abc123",
      "type": "image_analysis",
      "attributes": {
        "status": "completed",
        "verdict": "ai_generated",
        "confidence": 0.94,
        "created_at": "2026-02-02T10:30:00Z"
      }
    },
    {
      "id": "analysis_img_def456",
      "type": "image_analysis",
      "attributes": {
        "status": "completed",
        "verdict": "authentic",
        "confidence": 0.97,
        "created_at": "2026-02-02T10:25:00Z"
      }
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6ImFuYWx5c2lzX2ltZ19kZWY0NTYifQ",
    "prev_cursor": null
  },
  "meta": {
    "total_count": 1547,
    "returned_count": 20
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="export" className="mt-10 mb-4">
        Export Results
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Export results in PDF or JSON format for reports and compliance.
      </p>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'PDF Export',
            code: `curl https://api.forensivision.com/v1/results/analysis_img_abc123/export?format=pdf \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -o report.pdf`,
          },
          {
            language: 'bash',
            label: 'JSON Export',
            code: `curl https://api.forensivision.com/v1/results/analysis_img_abc123/export?format=json \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -o report.json`,
          },
        ]}
        className="mb-6"
      />
    </div>
  );
}
