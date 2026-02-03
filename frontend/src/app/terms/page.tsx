'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using ForensiVision ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, you may not use the Service. We reserve the right to modify these Terms at
              any time, and such modifications will be effective immediately upon posting.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              ForensiVision provides AI-powered media authenticity detection services, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>Image and video analysis for AI-generated content detection</li>
              <li>Deepfake detection capabilities</li>
              <li>Forensic reports and visualizations</li>
              <li>API access for programmatic integration</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              The Service is provided "as is" and detection results should be considered as analytical assessments,
              not definitive legal determinations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              To access certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>Upload content that you do not have the right to analyze</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others</li>
              <li>Attempt to circumvent usage limits or security measures</li>
              <li>Reverse engineer or attempt to extract the underlying models or algorithms</li>
              <li>Use the Service for harassment, defamation, or malicious purposes</li>
              <li>Redistribute or resell access to the Service without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The Service, including its design, features, algorithms, and content, is protected by intellectual property
              laws. You retain ownership of content you upload for analysis. By uploading content, you grant us a limited
              license to process and analyze it for the purpose of providing the Service. We do not claim ownership of
              your uploaded content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Payment and Subscriptions</h2>
            <p className="text-muted-foreground mb-4">
              Paid subscriptions are billed in advance on a monthly or annual basis. You authorize us to charge your
              payment method for all fees incurred. Refunds are available within 14 days of your first payment.
              Annual plans may be refunded on a prorated basis within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
            <p className="text-muted-foreground mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. We do not guarantee
              that detection results will be 100% accurate. Results are analytical assessments based on our models and
              should not be used as the sole basis for legal, professional, or other important decisions. We recommend
              using our results as one factor among many in your decision-making process.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FORENSIVISION SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR
              GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. Our total liability shall not exceed the amount you paid
              us in the twelve months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground mb-4">
              We may terminate or suspend your account at any time for violation of these Terms or for any other reason
              at our sole discretion. Upon termination, your right to use the Service will immediately cease. You may
              terminate your account at any time by contacting us or through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
            <p className="text-muted-foreground mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of California,
              United States, without regard to its conflict of law provisions. Any disputes arising under these Terms
              shall be resolved in the courts located in San Francisco, California.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about these Terms, please contact us at{' '}
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
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="text-foreground font-medium">Terms</Link>
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
