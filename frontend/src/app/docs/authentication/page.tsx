import { AnchorHeading } from '@/components/docs/anchor-heading';
import { CodeTabs } from '@/components/docs/code-tabs';
import { CodeBlock } from '@/components/docs/code-block';
import { ParamTable } from '@/components/docs/param-table';

export default function AuthenticationPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-4">Authentication</h1>
      <p className="text-lg text-muted-foreground mb-8">
        ForensiVision supports two authentication methods: API Keys for server-to-server
        communication, and OAuth 2.0 / JWT for user-facing applications.
      </p>

      <AnchorHeading id="api-keys" className="mt-10 mb-4">
        API Keys
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        API keys are the simplest way to authenticate with the ForensiVision API. They're
        ideal for backend services and scripts where you can securely store the key.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">Key Format</h3>
      <p className="text-muted-foreground mb-4">
        API keys follow a structured format that indicates their environment and type:
      </p>
      <CodeBlock
        language="text"
        code={`fv_{environment}_{type}_{random}

Examples:
fv_live_sk_a1b2c3d4e5f6g7h8i9j0...  (Live secret key)
fv_live_pk_x9y8z7w6v5u4t3s2r1q0...  (Live publishable key)
fv_test_sk_m1n2o3p4q5r6s7t8u9v0...  (Test secret key)`}
        className="mb-6"
      />

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Key Type</th>
              <th className="text-left py-2 font-medium">Prefix</th>
              <th className="text-left py-2 font-medium">Use Case</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2 font-medium">Secret Key</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">sk_</code></td>
              <td className="py-2 text-muted-foreground">Server-side only. Full API access.</td>
            </tr>
            <tr>
              <td className="py-2 font-medium">Publishable Key</td>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">pk_</code></td>
              <td className="py-2 text-muted-foreground">Safe for client-side. Limited read access.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-3">Using API Keys</h3>
      <p className="text-muted-foreground mb-4">
        Include your API key in the <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Authorization</code> header
        using the Bearer scheme:
      </p>

      <CodeTabs
        examples={[
          {
            language: 'bash',
            label: 'cURL',
            code: `curl https://api.forensivision.com/v1/results/abc123 \\
  -H "Authorization: Bearer fv_live_sk_your_api_key_here"`,
          },
          {
            language: 'javascript',
            label: 'JavaScript',
            code: `const response = await fetch('https://api.forensivision.com/v1/results/abc123', {
  headers: {
    'Authorization': 'Bearer fv_live_sk_your_api_key_here',
  },
});`,
          },
          {
            language: 'python',
            label: 'Python',
            code: `import requests

response = requests.get(
    'https://api.forensivision.com/v1/results/abc123',
    headers={
        'Authorization': 'Bearer fv_live_sk_your_api_key_here',
    },
)`,
          },
        ]}
        className="mb-6"
      />

      <AnchorHeading id="oauth" className="mt-10 mb-4">
        OAuth 2.0 / JWT
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        For applications that need to act on behalf of users, we support the OAuth 2.0
        authorization code flow. This issues JWT access tokens that can be used to authenticate requests.
      </p>

      <h3 className="text-lg font-semibold mt-6 mb-3">OAuth Flow</h3>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
        <li>Redirect users to our authorization endpoint</li>
        <li>User grants permission to your application</li>
        <li>We redirect back with an authorization code</li>
        <li>Exchange the code for access and refresh tokens</li>
        <li>Use the access token to make API requests</li>
      </ol>

      <h4 className="text-base font-semibold mt-6 mb-3">Step 1: Authorization Request</h4>
      <p className="text-muted-foreground mb-4">
        Redirect users to the authorization URL:
      </p>
      <CodeBlock
        language="text"
        code={`https://api.forensivision.com/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  response_type=code&
  scope=analyze:read analyze:write results:read&
  state=random_state_value`}
        className="mb-6"
      />

      <h4 className="text-base font-semibold mt-6 mb-3">Step 2: Token Exchange</h4>
      <p className="text-muted-foreground mb-4">
        After the user authorizes, exchange the code for tokens:
      </p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.forensivision.com/v1/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTH_CODE_FROM_CALLBACK" \\
  -d "redirect_uri=https://yourapp.com/callback" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`}
        className="mb-6"
      />

      <h4 className="text-base font-semibold mt-6 mb-3">Token Response</h4>
      <CodeBlock
        language="json"
        code={`{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "fv_rt_abc123...",
  "scope": "analyze:read analyze:write results:read"
}`}
        className="mb-6"
      />

      <AnchorHeading id="scopes" className="mt-10 mb-4">
        Scopes Reference
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Scopes control what actions an API key or token can perform:
      </p>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">Scope</th>
              <th className="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analyze:read</code></td>
              <td className="py-2 text-muted-foreground">View analysis jobs and queue status</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">analyze:write</code></td>
              <td className="py-2 text-muted-foreground">Create new analysis jobs</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">results:read</code></td>
              <td className="py-2 text-muted-foreground">Read analysis results</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">results:export</code></td>
              <td className="py-2 text-muted-foreground">Export results (PDF, JSON)</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">webhooks:manage</code></td>
              <td className="py-2 text-muted-foreground">Create, update, and delete webhooks</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">usage:read</code></td>
              <td className="py-2 text-muted-foreground">View usage statistics</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">billing:read</code></td>
              <td className="py-2 text-muted-foreground">View billing information</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">billing:write</code></td>
              <td className="py-2 text-muted-foreground">Update billing settings</td>
            </tr>
            <tr>
              <td className="py-2"><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">admin:*</code></td>
              <td className="py-2 text-muted-foreground">Full administrative access (Enterprise only)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AnchorHeading id="jwt-structure" className="mt-10 mb-4">
        JWT Token Structure
      </AnchorHeading>
      <p className="text-muted-foreground mb-4">
        Access tokens are JWTs signed with RS256. Here's the structure:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-2024-01"
  },
  "payload": {
    "iss": "https://api.forensivision.com",
    "sub": "user_abc123",
    "aud": "https://api.forensivision.com",
    "exp": 1706918400,
    "iat": 1706832000,
    "scope": "analyze:read analyze:write results:read",
    "org_id": "org_xyz789",
    "tier": "pro"
  }
}`}
        className="mb-6"
      />

      <AnchorHeading id="security" className="mt-10 mb-4">
        Security Best Practices
      </AnchorHeading>
      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
        <li>Never expose secret keys in client-side code or version control</li>
        <li>Use environment variables to store API keys</li>
        <li>Rotate keys regularly and revoke unused keys</li>
        <li>Use the minimum required scopes for each key</li>
        <li>Implement proper error handling for 401 responses</li>
        <li>Use HTTPS for all API requests</li>
      </ul>
    </div>
  );
}
