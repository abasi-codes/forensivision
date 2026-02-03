import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { ParamTable } from '@/components/docs/param-table';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function AnalyzeVideoPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Analyze Video</h1>

      <EndpointHeader
        method="POST"
        path="/v1/analyze/video"
        description="Analyze a video for deepfakes, face swaps, lip-sync manipulation, and AI-generated content."
      />

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
          <strong>Pro and Enterprise only.</strong> Video analysis requires a Pro or Enterprise plan.
          Free tier users can analyze images only.
        </p>
      </div>

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
            description: 'Source type: "url", "upload", or "youtube"',
          },
          {
            name: 'source.url',
            type: 'string',
            description: 'URL of the video to analyze. For YouTube, use the full video URL.',
          },
          {
            name: 'source.upload_id',
            type: 'string',
            description: 'Upload ID from presigned upload flow.',
          },
        ]}
      />

      <ParamTable
        title="Options (optional)"
        parameters={[
          {
            name: 'options.models',
            type: 'string[]',
            description: 'Detection models to use.',
            default: '["face_swap_v2", "lip_sync_v1", "audio_deepfake_v1"]',
          },
          {
            name: 'options.analysis_mode',
            type: 'string',
            description: '"quick" for fast results, "full" for comprehensive analysis.',
            default: '"full"',
          },
          {
            name: 'options.frame_sampling.strategy',
            type: 'string',
            description: '"adaptive", "fixed", or "all". Adaptive adjusts based on scene changes.',
            default: '"adaptive"',
          },
          {
            name: 'options.frame_sampling.min_fps',
            type: 'number',
            description: 'Minimum frames per second to analyze.',
            default: '1',
          },
          {
            name: 'options.frame_sampling.max_fps',
            type: 'number',
            description: 'Maximum frames per second to analyze.',
            default: '5',
          },
          {
            name: 'options.face_tracking',
            type: 'boolean',
            description: 'Track faces across frames for temporal analysis.',
            default: 'true',
          },
          {
            name: 'options.audio_analysis',
            type: 'boolean',
            description: 'Analyze audio for voice cloning and lip-sync mismatch.',
            default: 'true',
          },
          {
            name: 'options.temporal_consistency',
            type: 'boolean',
            description: 'Check for temporal inconsistencies in video.',
            default: 'true',
          },
        ]}
      />

      <ParamTable
        title="Priority (optional)"
        parameters={[
          {
            name: 'priority',
            type: 'string',
            description: '"low", "normal", or "high". Higher priority analyses are processed first.',
            default: '"normal"',
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
            code: `curl -X POST https://api.forensivision.com/v1/analyze/video \\
  -H "Authorization: Bearer fv_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "type": "url",
      "url": "https://example.com/video.mp4"
    },
    "options": {
      "models": ["face_swap_v2", "lip_sync_v1", "audio_deepfake_v1"],
      "analysis_mode": "full",
      "face_tracking": true,
      "audio_analysis": true
    },
    "webhook": {
      "url": "https://yourapp.com/webhooks/forensivision",
      "events": ["analysis.progress", "analysis.completed", "analysis.failed"]
    },
    "priority": "high"
  }'`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/analyze/video', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: {
      type: 'url',
      url: 'https://example.com/video.mp4',
    },
    options: {
      models: ['face_swap_v2', 'lip_sync_v1', 'audio_deepfake_v1'],
      analysis_mode: 'full',
      face_tracking: true,
      audio_analysis: true,
    },
    webhook: {
      url: 'https://yourapp.com/webhooks/forensivision',
      events: ['analysis.progress', 'analysis.completed', 'analysis.failed'],
    },
    priority: 'high',
  }),
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.post(
    'https://api.forensivision.com/v1/analyze/video',
    headers={
        'Authorization': 'Bearer fv_live_sk_...',
        'Content-Type': 'application/json',
    },
    json={
        'source': {
            'type': 'url',
            'url': 'https://example.com/video.mp4',
        },
        'options': {
            'models': ['face_swap_v2', 'lip_sync_v1', 'audio_deepfake_v1'],
            'analysis_mode': 'full',
            'face_tracking': True,
            'audio_analysis': True,
        },
        'webhook': {
            'url': 'https://yourapp.com/webhooks/forensivision',
            'events': ['analysis.progress', 'analysis.completed', 'analysis.failed'],
        },
        'priority': 'high',
    },
)`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="response" className="mt-10 mb-4">
        Response
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Video analysis is always asynchronous. Use webhooks or poll the results endpoint.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Processing Response (202 Accepted)</h3>
      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "analysis_vid_def456",
    "type": "video_analysis",
    "attributes": {
      "status": "processing",
      "progress": 15,
      "current_stage": "frame_extraction",
      "stages": [
        { "name": "upload_validation", "status": "completed", "duration_ms": 1200 },
        { "name": "frame_extraction", "status": "in_progress", "progress": 45 },
        { "name": "face_detection", "status": "pending" },
        { "name": "deepfake_analysis", "status": "pending" },
        { "name": "audio_analysis", "status": "pending" },
        { "name": "temporal_analysis", "status": "pending" },
        { "name": "result_aggregation", "status": "pending" }
      ],
      "estimated_completion": "2026-02-02T10:45:00Z",
      "file": {
        "name": "video.mp4",
        "size_bytes": 52428800,
        "mime_type": "video/mp4",
        "duration_seconds": 120,
        "resolution": "1920x1080",
        "fps": 30
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_vid_def456",
      "cancel": "/v1/analysis/analysis_vid_def456/cancel",
      "progress": "/v1/analysis/analysis_vid_def456/progress"
    }
  }
}`}
        className="mb-6"
      />

      <h3 className="text-lg font-semibold mt-6 mb-3">Completed Response</h3>
      <CodeBlock
        language="json"
        code={`{
  "data": {
    "id": "analysis_vid_def456",
    "type": "video_analysis",
    "attributes": {
      "status": "completed",
      "results": {
        "verdict": "manipulated",
        "confidence": 0.87,
        "risk_level": "high",
        "summary": "Face swap detected on primary subject between timestamps 0:15-1:45.",
        "video_analysis": {
          "frames_analyzed": 3600,
          "faces_detected": 2,
          "manipulation_segments": [
            {
              "start_time": 15.0,
              "end_time": 105.0,
              "type": "face_swap",
              "confidence": 0.91,
              "affected_face_id": 1,
              "details": {
                "blending_artifacts": true,
                "temporal_inconsistency": true
              }
            }
          ]
        },
        "audio_analysis": {
          "verdict": "authentic",
          "confidence": 0.95,
          "lip_sync_score": 0.72,
          "voice_consistency": 0.94
        },
        "temporal_analysis": {
          "frame_consistency": 0.65,
          "motion_artifacts": ["jitter_detected", "interpolation_artifacts"]
        }
      }
    }
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="limits" className="mt-10 mb-4">
        Limits
      </AnchorHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Plan</th>
              <th className="text-left py-2 font-medium">Max Duration</th>
              <th className="text-left py-2 font-medium">Max File Size</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">Free</td>
              <td className="py-2 text-muted-foreground">Not available</td>
              <td className="py-2 text-muted-foreground">—</td>
            </tr>
            <tr>
              <td className="py-2">Pro</td>
              <td className="py-2 text-muted-foreground">5 minutes</td>
              <td className="py-2 text-muted-foreground">500 MB</td>
            </tr>
            <tr>
              <td className="py-2">Enterprise</td>
              <td className="py-2 text-muted-foreground">Unlimited</td>
              <td className="py-2 text-muted-foreground">2 GB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
