import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function QuickStartPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Quick Start</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Get started with the ForensiVision API in under 5 minutes. This guide will walk you through
        making your first API request to analyze an image for AI-generated content.
      </p>

      <AnchorHeading id="base-urls" className="mt-10 mb-4">
        Base URLs
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        ForensiVision provides three environments for different stages of development:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Environment</th>
              <th className="text-left py-2 font-medium">Base URL</th>
              <th className="text-left py-2 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2 font-medium">Production</td>
              <td className="py-2">
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">
                  https://api.forensivision.com/v1
                </code>
              </td>
              <td className="py-2 text-muted-foreground">Live API with production data</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Staging</td>
              <td className="py-2">
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">
                  https://api.staging.forensivision.com/v1
                </code>
              </td>
              <td className="py-2 text-muted-foreground">Testing new features before production</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Sandbox</td>
              <td className="py-2">
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">
                  https://api.sandbox.forensivision.com/v1
                </code>
              </td>
              <td className="py-2 text-muted-foreground">Development with mock responses</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="get-api-key" className="mt-10 mb-4">
        Get Your API Key
      </AnchorHeading>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
        <li>Sign up for a <a href="/register" className="text-primary hover:underline">free account</a></li>
        <li>Navigate to <strong>Settings → API Keys</strong> in your dashboard</li>
        <li>Click <strong>Create API Key</strong> and give it a name</li>
        <li>Copy your secret key (starts with <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">fv_live_sk_</code>)</li>
      </ol>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Keep your secret key secure. Never expose it in client-side code
          or commit it to version control.
        </p>
      </div>

      <AnchorHeading id="first-request" className="mt-10 mb-4">
        Make Your First Request
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Let's analyze an image by providing its URL. Replace <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">YOUR_API_KEY</code> with
        your actual API key:
      </p>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl -X POST https://api.forensivision.com/v1/analyze/image \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "type": "url",
      "url": "https://example.com/image-to-analyze.jpg"
    },
    "options": {
      "detail_level": "standard"
    }
  }'`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/analyze/image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: {
      type: 'url',
      url: 'https://example.com/image-to-analyze.jpg',
    },
    options: {
      detail_level: 'standard',
    },
  }),
});

const data = await response.json();
console.log(data);`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/analyze/image',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'source': {
            'type': 'url',
            'url': 'https://example.com/image-to-analyze.jpg',
        },
        'options': {
            'detail_level': 'standard',
        },
    },
)

print(response.json())`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="response" className="mt-10 mb-4">
        Understanding the Response
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The API returns a JSON response following the JSON:API specification. Here's an example
        response for an AI-generated image:
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
      "results": {
        "verdict": "ai_generated",
        "confidence": 0.94,
        "risk_level": "high",
        "summary": "This image shows strong indicators of AI generation.",
        "detections": [
          {
            "model": "deepfake_v3",
            "verdict": "ai_generated",
            "confidence": 0.92
          }
        ]
      }
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "processing_time_ms": 12340
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="verdicts" className="mt-10 mb-4">
        Verdict Values
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">verdict</code> field indicates our assessment:
      </p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Verdict</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="text-green-600">authentic</code></td>
              <td className="py-2 text-muted-foreground">High confidence the content is genuine</td>
            </tr>
            <tr>
              <td className="py-2"><code className="text-green-600">likely_authentic</code></td>
              <td className="py-2 text-muted-foreground">Probable authentic content with minor uncertainty</td>
            </tr>
            <tr>
              <td className="py-2"><code className="text-yellow-600">inconclusive</code></td>
              <td className="py-2 text-muted-foreground">Unable to determine with confidence</td>
            </tr>
            <tr>
              <td className="py-2"><code className="text-red-600">likely_ai</code></td>
              <td className="py-2 text-muted-foreground">Probable AI-generated content</td>
            </tr>
            <tr>
              <td className="py-2"><code className="text-red-600">ai_generated</code></td>
              <td className="py-2 text-muted-foreground">High confidence content is AI-generated</td>
            </tr>
            <tr>
              <td className="py-2"><code className="text-red-600">manipulated</code></td>
              <td className="py-2 text-muted-foreground">Content has been digitally altered</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="next-steps" className="mt-10 mb-4">
        Next Steps
      </AnchorHeading>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li>Learn about <a href="/docs/authentication" className="text-primary hover:underline">authentication options</a> including OAuth and JWT</li>
        <li>Explore the <a href="/docs/endpoints/analyze-image" className="text-primary hover:underline">full image analysis endpoint</a> with all parameters</li>
        <li>Set up <a href="/docs/webhooks" className="text-primary hover:underline">webhooks</a> for async notifications</li>
        <li>Review <a href="/docs/rate-limits" className="text-primary hover:underline">rate limits</a> for your plan</li>
      </ul>
    </div>
  );
}
