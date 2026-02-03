'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-xl font-bold">ForensiVision</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition">
                Pricing
              </Link>
              <Link href="/docs" className="text-muted-foreground hover:text-foreground transition">
                API Docs
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely by our payment provider)</li>
              <li><strong>Uploaded Content:</strong> Images and videos you submit for analysis</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our Service</li>
              <li><strong>Communications:</strong> Information you provide when contacting us for support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process and analyze uploaded content for AI detection</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional communications (account updates, security alerts)</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Data Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. We may share information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li><strong>Service Providers:</strong> With vendors who assist in providing our Service (payment processing, hosting, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your information for as long as your account is active or as needed to provide you services:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li><strong>Uploaded Content:</strong> Automatically deleted according to your plan's retention policy (72 hours for Free, 1 year for Pro, custom for Enterprise)</li>
              <li><strong>Account Information:</strong> Retained until you delete your account</li>
              <li><strong>Analysis Results:</strong> Retained according to your plan's retention policy</li>
              <li><strong>Usage Logs:</strong> Retained for up to 90 days for operational purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>All data is encrypted in transit using TLS 1.3</li>
              <li>Data at rest is encrypted using AES-256</li>
              <li>Files are processed in isolated, secure environments</li>
              <li>We maintain SOC 2 Type II compliance</li>
              <li>Regular security audits and penetration testing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:aaron@iotex.io" className="text-primary hover:underline">aaron@iotex.io</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the Service to function properly</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              You can control cookies through your browser settings. Disabling certain cookies may affect functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">
              Your information may be transferred to and processed in countries other than your own. We ensure
              appropriate safeguards are in place to protect your data in accordance with applicable laws, including
              standard contractual clauses approved by relevant authorities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground mb-4">
              Our Service is not directed to children under 16. We do not knowingly collect personal information from
              children under 16. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the new policy on this page and updating the "Last updated" date. Your continued use of the
              Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:aaron@iotex.io" className="text-primary hover:underline">aaron@iotex.io</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-semibold">ForensiVision</span>
            </Link>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="/privacy" className="text-foreground font-medium">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/docs" className="hover:text-foreground">API</Link>
              <Link href="/contact" className="hover:text-foreground">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 ForensiVision. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
