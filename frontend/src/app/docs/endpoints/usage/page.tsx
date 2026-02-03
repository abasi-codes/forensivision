import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function UsagePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Get Usage</h1>

      <EndpointHeader
        method="GET"
        path="/v1/usage"
        description="Retrieve current usage statistics for your account or organization."
      />

      <AnchorHeading id="query-parameters" className="mt-10 mb-4">
        Query Parameters
      </AnchorHeading>
      <ParamTable
        parameters={[
          {
            name: 'period',
            type: 'string',
            description: '"current" for current billing period, or ISO 8601 month (e.g., "2026-02").',
            default: '"current"',
          },
          {
            name: 'breakdown',
            type: 'string',
            description: 'Breakdown by: "day", "type", "model", or "user" (org admins only).',
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
            code: `curl https://api.forensivision.com/v1/usage?period=current&breakdown=type \\
  -H "Authorization: Bearer fv_live_sk_..."`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch(
  'https://api.forensivision.com/v1/usage?period=current&breakdown=type',
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
    'https://api.forensivision.com/v1/usage',
    params={'period': 'current', 'breakdown': 'type'},
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
    "id": "usage_2026_02",
    "type": "usage",
    "attributes": {
      "period": {
        "start": "2026-02-01T00:00:00Z",
        "end": "2026-02-28T23:59:59Z"
      },
      "plan": {
        "name": "Pro",
        "quota": 500
      },
      "summary": {
        "total_analyses": 342,
        "remaining": 158,
        "percentage_used": 68.4
      },
      "breakdown_by_type": {
        "image": 298,
        "video": 44
      },
      "api_calls": {
        "total": 1247,
        "by_endpoint": {
          "analyze_image": 298,
          "analyze_video": 44,
          "get_results": 856,
          "list_results": 49
        }
      },
      "costs": {
        "current_charges": 29.00,
        "overage_charges": 0,
        "currency": "USD"
      }
    }
  },
  "meta": {
    "request_id": "req_xyz789"
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="breakdown-by-day" className="mt-10 mb-4">
        Breakdown by Day
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">breakdown=day</code> to see daily usage:
      </p>

      <CodeBlock
        language="json"
        code={`{
  "data": {
    "attributes": {
      "breakdown_by_day": [
        { "date": "2026-02-01", "analyses": 45, "api_calls": 187 },
        { "date": "2026-02-02", "analyses": 52, "api_calls": 203 },
        { "date": "2026-02-03", "analyses": 38, "api_calls": 156 }
      ]
    }
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="quota-alerts" className="mt-10 mb-4">
        Quota Alerts
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The API returns warning headers when approaching quota limits:
      </p>
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
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-Quota-Remaining</code></td>
              <td className="py-2 text-muted-foreground">Number of analyses remaining this period</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-Quota-Reset</code></td>
              <td className="py-2 text-muted-foreground">ISO 8601 timestamp when quota resets</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-Quota-Warning</code></td>
              <td className="py-2 text-muted-foreground">Present when usage exceeds 80%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
