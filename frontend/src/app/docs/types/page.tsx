import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeBlock } from '@/components/docs/code-block';

export default function TypesPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Response Types</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Reference documentation for all response types and data models used in the ForensiVision API.
      </p>

      <AnchorHeading id="analysis-status" className="mt-10 mb-4">
        AnalysisStatus
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The current status of an analysis job:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Value</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">pending</code></td>
              <td className="py-2 text-muted-foreground">Job is queued and waiting to be processed</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">processing</code></td>
              <td className="py-2 text-muted-foreground">Analysis is in progress</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">completed</code></td>
              <td className="py-2 text-muted-foreground">Analysis finished successfully</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">failed</code></td>
              <td className="py-2 text-muted-foreground">Analysis failed with an error</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">cancelled</code></td>
              <td className="py-2 text-muted-foreground">Analysis was cancelled by the user</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="verdict" className="mt-10 mb-4">
        Verdict
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        The detection verdict for an analysis:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Value</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-green-100 dark:bg-green-900 px-1 rounded text-green-700 dark:text-green-300">authentic</code></td>
              <td className="py-2 text-muted-foreground">High confidence the content is genuine (90%+)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-green-100 dark:bg-green-900 px-1 rounded text-green-700 dark:text-green-300">likely_authentic</code></td>
              <td className="py-2 text-muted-foreground">Probable genuine content (70-90%)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded text-yellow-700 dark:text-yellow-300">inconclusive</code></td>
              <td className="py-2 text-muted-foreground">Cannot determine with confidence (&lt;70%)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-red-100 dark:bg-red-900 px-1 rounded text-red-700 dark:text-red-300">likely_ai</code></td>
              <td className="py-2 text-muted-foreground">Probable AI-generated content (70-90%)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-red-100 dark:bg-red-900 px-1 rounded text-red-700 dark:text-red-300">ai_generated</code></td>
              <td className="py-2 text-muted-foreground">High confidence content is AI-generated (90%+)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-red-100 dark:bg-red-900 px-1 rounded text-red-700 dark:text-red-300">manipulated</code></td>
              <td className="py-2 text-muted-foreground">Content has been digitally altered</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="risk-level" className="mt-10 mb-4">
        RiskLevel
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Overall risk assessment for the analyzed content:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Value</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-green-100 dark:bg-green-900 px-1 rounded">low</code></td>
              <td className="py-2 text-muted-foreground">Content appears genuine, low risk of manipulation</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">medium</code></td>
              <td className="py-2 text-muted-foreground">Some indicators detected, manual review recommended</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-red-100 dark:bg-red-900 px-1 rounded">high</code></td>
              <td className="py-2 text-muted-foreground">Strong indicators of AI generation or manipulation</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="image-analysis" className="mt-10 mb-4">
        ImageAnalysis
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Complete response for an image analysis:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "id": "string",           // Unique analysis ID
  "type": "image_analysis", // Resource type
  "attributes": {
    "status": "AnalysisStatus",
    "created_at": "ISO 8601 datetime",
    "completed_at": "ISO 8601 datetime | null",
    "file": {
      "name": "string",
      "size_bytes": "number",
      "mime_type": "string",
      "dimensions": {
        "width": "number",
        "height": "number"
      }
    },
    "results": {
      "verdict": "Verdict",
      "confidence": "number (0-1)",
      "risk_level": "RiskLevel",
      "summary": "string",
      "detections": [
        {
          "model": "string",
          "verdict": "Verdict",
          "confidence": "number (0-1)",
          "details": "object"
        }
      ],
      "ensemble_score": "number (0-1)",
      "heatmap_url": "string | null",
      "metadata": {
        "exif": "object | null",
        "forensic": "object"
      }
    }
  },
  "links": {
    "self": "string",
    "results": "string",
    "export_pdf": "string",
    "export_json": "string"
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="video-analysis" className="mt-10 mb-4">
        VideoAnalysis
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Complete response for a video analysis:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "id": "string",
  "type": "video_analysis",
  "attributes": {
    "status": "AnalysisStatus",
    "progress": "number (0-100)",
    "current_stage": "string | null",
    "stages": [
      {
        "name": "string",
        "status": "pending | in_progress | completed",
        "progress": "number | null",
        "duration_ms": "number | null"
      }
    ],
    "file": {
      "name": "string",
      "size_bytes": "number",
      "mime_type": "string",
      "duration_seconds": "number",
      "resolution": "string",
      "fps": "number"
    },
    "results": {
      "verdict": "Verdict",
      "confidence": "number (0-1)",
      "risk_level": "RiskLevel",
      "summary": "string",
      "video_analysis": {
        "frames_analyzed": "number",
        "faces_detected": "number",
        "manipulation_segments": [
          {
            "start_time": "number",
            "end_time": "number",
            "type": "string",
            "confidence": "number",
            "affected_face_id": "number | null",
            "details": "object"
          }
        ]
      },
      "audio_analysis": {
        "verdict": "Verdict",
        "confidence": "number",
        "lip_sync_score": "number",
        "voice_consistency": "number"
      },
      "temporal_analysis": {
        "frame_consistency": "number",
        "motion_artifacts": ["string"]
      },
      "face_tracking": [
        {
          "face_id": "number",
          "first_appearance": "number",
          "last_appearance": "number",
          "manipulation_detected": "boolean",
          "thumbnail_url": "string"
        }
      ]
    }
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="detection" className="mt-10 mb-4">
        Detection
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Individual model detection result:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "model": "string",        // Model ID (e.g., "deepfake_v3")
  "verdict": "Verdict",     // Model's verdict
  "confidence": "number",   // Confidence score (0-1)
  "details": {
    // Model-specific details
    "generation_type": "string | null",      // For AI detection
    "likely_source": "string | null",        // Detected generation source
    "artifacts_detected": ["string"],        // Found artifacts
    "frequency_analysis": "string | null",   // Frequency domain findings
    "noise_pattern": "string | null"         // Noise analysis results
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="pagination" className="mt-10 mb-4">
        Pagination
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Cursor-based pagination for list endpoints:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "pagination": {
    "has_more": "boolean",           // More results available
    "next_cursor": "string | null",  // Cursor for next page
    "prev_cursor": "string | null"   // Cursor for previous page
  },
  "meta": {
    "total_count": "number",         // Total matching records
    "returned_count": "number"       // Records in this response
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="webhook-event" className="mt-10 mb-4">
        WebhookEvent
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Webhook event payload structure:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "id": "string",              // Unique event ID
  "type": "string",            // Event type (e.g., "analysis.completed")
  "created_at": "ISO 8601",    // When event was created
  "data": {
    // Event-specific data (usually the affected resource)
  },
  "webhook_id": "string"       // ID of the webhook receiving this event
}`}
        className="mb-6"
      />

      <AnchorHeading id="typescript" className="mt-10 mb-4">
        TypeScript Definitions
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        TypeScript type definitions are available via npm:
      </p>
      <CodeBlock
        language="bash"
        code={`npm install @forensivision/types`}
        className="mb-4"
      />
      <CodeBlock
        language="javascript"
        code={`import type {
  ImageAnalysis,
  VideoAnalysis,
  Verdict,
  RiskLevel,
  Detection,
  WebhookEvent,
} from '@forensivision/types';`}
        className="mb-6"
      />
    </div>
  );
}
