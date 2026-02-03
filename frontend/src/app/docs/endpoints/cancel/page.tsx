import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function CancelPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Cancel Analysis</h1>

      <EndpointHeader
        method="POST"
        path="/v1/analysis/{id}/cancel"
        description="Cancel a pending or in-progress analysis job."
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
            description: 'The analysis ID to cancel.',
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
            code: `curl -X POST https://api.forensivision.com/v1/analysis/analysis_vid_def456/cancel \\
  -H "Authorization: Bearer fv_live_sk_..."`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch(
  'https://api.forensivision.com/v1/analysis/analysis_vid_def456/cancel',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fv_live_sk_...',
    },
  }
);`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/analysis/analysis_vid_def456/cancel',
    headers={'Authorization': 'Bearer fv_live_sk_...'},
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
    "id": "analysis_vid_def456",
    "type": "video_analysis",
    "attributes": {
      "status": "cancelled",
      "created_at": "2026-02-02T10:30:00Z",
      "cancelled_at": "2026-02-02T10:32:00Z",
      "progress_at_cancellation": 35
    }
  },
  "meta": {
    "request_id": "req_xyz789"
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="behavior" className="mt-10 mb-4">
        Cancellation Behavior
      </AnchorHeading>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li><strong>Pending jobs:</strong> Immediately cancelled, no resources consumed</li>
        <li><strong>Processing jobs:</strong> Cancelled at next checkpoint, partial results may be available</li>
        <li><strong>Completed jobs:</strong> Cannot be cancelled (returns 400 error)</li>
        <li><strong>Failed jobs:</strong> Cannot be cancelled (returns 400 error)</li>
      </ul>

      <AnchorHeading id="quota" className="mt-10 mb-4">
        Quota Impact
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Cancelled analyses do not count against your monthly quota if cancelled within 30 seconds
        of creation. After 30 seconds, the analysis counts as used regardless of completion status.
      </p>

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
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">CANNOT_CANCEL</code></td>
              <td className="py-2 text-muted-foreground">Analysis is already completed or failed</td>
            </tr>
            <tr>
              <td className="py-2">404</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">NOT_FOUND</code></td>
              <td className="py-2 text-muted-foreground">Analysis ID does not exist</td>
            </tr>
            <tr>
              <td className="py-2">403</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">FORBIDDEN</code></td>
              <td className="py-2 text-muted-foreground">Not authorized to cancel this analysis</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
