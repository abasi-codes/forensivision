import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';

export default function WebhooksGuidePage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Webhook Setup Guide</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Learn how to set up webhooks to receive real-time notifications when analysis jobs complete.
        Webhooks eliminate the need for polling and enable event-driven architectures.
      </p>

      <AnchorHeading id="overview" className="mt-10 mb-4">
        Overview
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        When you register a webhook, ForensiVision will send HTTP POST requests to your endpoint
        whenever subscribed events occur. Each request includes a signature header for verification.
      </p>

      <AnchorHeading id="setup" className="mt-10 mb-4">
        Setting Up a Webhook
      </AnchorHeading>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
        <li>Create an HTTPS endpoint on your server to receive webhook events</li>
        <li>Register the webhook using the <a href="/docs/endpoints/webhooks" className="text-primary hover:underline">Webhooks API</a></li>
        <li>Store the webhook secret securely for signature verification</li>
        <li>Implement signature verification in your endpoint handler</li>
        <li>Return a 2xx status code to acknowledge receipt</li>
      </ol>

      <AnchorHeading id="payload" className="mt-10 mb-4">
        Webhook Payload
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        All webhook payloads follow a consistent structure:
      </p>

      <CodeBlock
        language="json"
        code={`{
  "id": "evt_abc123def456",
  "type": "analysis.completed",
  "created_at": "2026-02-02T10:30:45Z",
  "data": {
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "completed",
      "verdict": "ai_generated",
      "confidence": 0.94,
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:45Z"
    },
    "links": {
      "self": "/v1/results/analysis_img_abc123"
    }
  },
  "webhook_id": "webhook_xyz789"
}`}
        className="mb-6"
      />

      <AnchorHeading id="headers" className="mt-10 mb-4">
        Request Headers
      </AnchorHeading>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Header</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Content-Type</code></td>
              <td className="py-2 text-muted-foreground">application/json</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-ForensiVision-Signature</code></td>
              <td className="py-2 text-muted-foreground">HMAC-SHA256 signature for verification</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-ForensiVision-Timestamp</code></td>
              <td className="py-2 text-muted-foreground">Unix timestamp of when the event was sent</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">X-ForensiVision-Event-ID</code></td>
              <td className="py-2 text-muted-foreground">Unique event ID for deduplication</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="verification" className="mt-10 mb-4">
        Signature Verification
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Always verify webhook signatures to ensure requests come from ForensiVision. The signature
        is computed as HMAC-SHA256 of the timestamp and request body, using your webhook secret.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Signature Format</h3>
      <CodeBlock
        language="text"
        code={`signature = HMAC-SHA256(
  key: webhook_secret,
  message: timestamp + "." + request_body
)`}
        className="mb-6"
      />

      <h3 className="text-lg font-semibold mt-6 mb-3">Verification Examples</h3>

      <CodeTabs
        examples={[
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  // Reject old timestamps (replay attack protection)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    throw new Error('Timestamp too old');
  }

  // Compute expected signature
  const signedPayload = timestamp + '.' + payload;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (constant-time)
  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid signature');
  }

  return true;
}

// Express.js example
app.post('/webhooks/forensivision', (req, res) => {
  const signature = req.headers['x-forensivision-signature'];
  const timestamp = req.headers['x-forensivision-timestamp'];

  try {
    verifyWebhookSignature(
      JSON.stringify(req.body),
      signature,
      timestamp,
      process.env.WEBHOOK_SECRET
    );

    // Process the event
    const event = req.body;
    console.log('Received event:', event.type);

    res.status(200).send('OK');
  } catch (err) {
    res.status(400).send('Invalid signature');
  }
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import hmac
import hashlib
import time
from flask import Flask, request, abort

app = Flask(__name__)

def verify_webhook_signature(payload, signature, timestamp, secret):
    # Reject old timestamps (replay attack protection)
    current_time = int(time.time())
    if abs(current_time - int(timestamp)) > 300:
        raise ValueError('Timestamp too old')

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload}"
    expected_signature = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    # Compare signatures (constant-time)
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError('Invalid signature')

    return True

@app.route('/webhooks/forensivision', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-ForensiVision-Signature')
    timestamp = request.headers.get('X-ForensiVision-Timestamp')

    try:
        verify_webhook_signature(
            request.get_data(as_text=True),
            signature,
            timestamp,
            os.environ['WEBHOOK_SECRET']
        )

        # Process the event
        event = request.json
        print(f"Received event: {event['type']}")

        return 'OK', 200
    except ValueError as e:
        abort(400, str(e))`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="retry-policy" className="mt-10 mb-4">
        Retry Policy
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        ForensiVision automatically retries failed webhook deliveries with exponential backoff:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Attempt</th>
              <th className="text-left py-2 font-medium">Delay</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2">1st retry</td>
              <td className="py-2 text-muted-foreground">1 minute</td>
            </tr>
            <tr>
              <td className="py-2">2nd retry</td>
              <td className="py-2 text-muted-foreground">5 minutes</td>
            </tr>
            <tr>
              <td className="py-2">3rd retry</td>
              <td className="py-2 text-muted-foreground">30 minutes</td>
            </tr>
            <tr>
              <td className="py-2">4th retry</td>
              <td className="py-2 text-muted-foreground">2 hours</td>
            </tr>
            <tr>
              <td className="py-2">5th retry</td>
              <td className="py-2 text-muted-foreground">24 hours</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mb-4">
        After 5 failed attempts, the webhook is marked as failed and the event is logged for
        manual review. You can view delivery status in the dashboard.
      </p>

      <AnchorHeading id="best-practices" className="mt-10 mb-4">
        Best Practices
      </AnchorHeading>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li><strong>Return 2xx quickly:</strong> Acknowledge receipt within 5 seconds to avoid timeouts</li>
        <li><strong>Process asynchronously:</strong> Queue heavy processing for background workers</li>
        <li><strong>Handle duplicates:</strong> Use event IDs for idempotency in case of retries</li>
        <li><strong>Monitor delivery:</strong> Set up alerts for failed webhook deliveries</li>
        <li><strong>Use HTTPS:</strong> Webhook URLs must use HTTPS for security</li>
        <li><strong>Validate timestamps:</strong> Reject events older than 5 minutes to prevent replay attacks</li>
      </ul>
    </div>
  );
}
