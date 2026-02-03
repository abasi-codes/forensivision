import { AnchorHeading } from '@/components/docs/anchor-heading';
import { EndpointHeader } from '@/components/docs/endpoint-header';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function ModelsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">List Models</h1>

      <EndpointHeader
        method="GET"
        path="/v1/models"
        description="List all available detection models and their capabilities."
      />

      <AnchorHeading id="request-example" className="mt-10 mb-4">
        Request Example
      </AnchorHeading>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl https://api.forensivision.com/v1/models \\
  -H "Authorization: Bearer fv_live_sk_..."`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/models', {
  headers: {
    'Authorization': 'Bearer fv_live_sk_...',
  },
});

const data = await response.json();`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.get(
    'https://api.forensivision.com/v1/models',
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
  "data": [
    {
      "id": "deepfake_v3",
      "type": "model",
      "attributes": {
        "name": "Deepfake Detector v3",
        "description": "Multi-purpose detector for AI-generated images and face manipulations.",
        "version": "3.2.1",
        "media_types": ["image", "video"],
        "capabilities": [
          "full_synthetic_detection",
          "face_swap_detection",
          "inpainting_detection"
        ],
        "detection_targets": [
          "stable_diffusion",
          "midjourney",
          "dalle",
          "deepfacelab",
          "faceswap"
        ],
        "accuracy": {
          "benchmark": "ForensiVision Test Set v2",
          "overall": 0.97,
          "by_target": {
            "stable_diffusion": 0.98,
            "midjourney": 0.96,
            "dalle": 0.97,
            "face_swap": 0.95
          }
        },
        "performance": {
          "avg_latency_ms": 450,
          "throughput_images_per_sec": 2.2
        },
        "tier_required": "free"
      }
    },
    {
      "id": "gan_detector_v2",
      "type": "model",
      "attributes": {
        "name": "GAN Detector v2",
        "description": "Specialized detector for GAN-generated content using frequency analysis.",
        "version": "2.1.0",
        "media_types": ["image"],
        "capabilities": [
          "frequency_analysis",
          "noise_pattern_analysis",
          "compression_artifact_detection"
        ],
        "detection_targets": [
          "stylegan",
          "stylegan2",
          "progan",
          "thispersondoesnotexist"
        ],
        "accuracy": {
          "benchmark": "ForensiVision Test Set v2",
          "overall": 0.94
        },
        "performance": {
          "avg_latency_ms": 280,
          "throughput_images_per_sec": 3.5
        },
        "tier_required": "free"
      }
    },
    {
      "id": "diffusion_v1",
      "type": "model",
      "attributes": {
        "name": "Diffusion Model Detector v1",
        "description": "Specialized for detecting latent diffusion model outputs.",
        "version": "1.4.0",
        "media_types": ["image"],
        "capabilities": [
          "diffusion_fingerprint_detection",
          "cfg_scale_estimation",
          "prompt_residual_analysis"
        ],
        "detection_targets": [
          "stable_diffusion_1.5",
          "stable_diffusion_xl",
          "flux",
          "midjourney_v5",
          "dalle_3"
        ],
        "accuracy": {
          "benchmark": "ForensiVision Test Set v2",
          "overall": 0.96
        },
        "tier_required": "free"
      }
    },
    {
      "id": "face_swap_v2",
      "type": "model",
      "attributes": {
        "name": "Face Swap Detector v2",
        "description": "Detects face-swapped content in images and videos.",
        "version": "2.0.3",
        "media_types": ["image", "video"],
        "capabilities": [
          "face_boundary_detection",
          "blending_artifact_detection",
          "temporal_consistency_check"
        ],
        "detection_targets": [
          "deepfacelab",
          "faceswap",
          "simswap",
          "roop"
        ],
        "accuracy": {
          "overall": 0.93
        },
        "tier_required": "pro"
      }
    },
    {
      "id": "lip_sync_v1",
      "type": "model",
      "attributes": {
        "name": "Lip Sync Detector v1",
        "description": "Detects audio-visual mismatches and lip-sync deepfakes.",
        "version": "1.2.0",
        "media_types": ["video"],
        "capabilities": [
          "lip_sync_analysis",
          "audio_visual_correlation",
          "phoneme_matching"
        ],
        "detection_targets": [
          "wav2lip",
          "lipsync_expert"
        ],
        "accuracy": {
          "overall": 0.89
        },
        "tier_required": "pro"
      }
    },
    {
      "id": "audio_deepfake_v1",
      "type": "model",
      "attributes": {
        "name": "Audio Deepfake Detector v1",
        "description": "Detects AI-generated and cloned voices.",
        "version": "1.1.0",
        "media_types": ["video", "audio"],
        "capabilities": [
          "voice_cloning_detection",
          "tts_detection",
          "speaker_verification"
        ],
        "detection_targets": [
          "elevenlabs",
          "resemble_ai",
          "voice_ai",
          "tortoise_tts"
        ],
        "accuracy": {
          "overall": 0.91
        },
        "tier_required": "pro"
      }
    }
  ],
  "meta": {
    "total_count": 6
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="model-selection" className="mt-10 mb-4">
        Model Selection
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        When submitting an analysis, you can specify which models to use. If not specified,
        the API uses a default ensemble appropriate for your content type:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Content Type</th>
              <th className="text-left py-2 font-medium">Default Models</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">Image</td>
              <td className="py-2 text-muted-foreground">deepfake_v3, gan_detector_v2, diffusion_v1</td>
            </tr>
            <tr>
              <td className="py-2">Video</td>
              <td className="py-2 text-muted-foreground">face_swap_v2, lip_sync_v1, audio_deepfake_v1</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
