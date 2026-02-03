'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

// ============ Pricing Data ============

const tiers = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    quota: '25 analyses/mo',
    description: 'For individuals exploring AI detection',
    features: [
      'Single image analysis',
      'Video analysis (up to 20 sec)',
      'Basic verdict (AI/Authentic/Inconclusive)',
      'Confidence scores',
      '72-hour result retention',
      'Community support',
    ],
    cta: 'Get Started',
    ctaLink: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: { monthly: 29, annual: 24 },
    quota: '500 analyses/mo',
    description: 'For journalists, creators, and power users',
    badge: 'Most Popular',
    trialBadge: '14-day free trial',
    features: [
      'Everything in Free, plus:',
      'Video analysis (up to 5 min)',
      'YouTube URL analysis',
      'Heatmap visualizations',
      'Detailed forensic reports',
      'Export (PDF/JSON)',
      'API access (500 calls/mo)',
      '1-year retention',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: null, annual: null },
    quota: 'Unlimited',
    description: 'For organizations with advanced needs',
    features: [
      'Everything in Pro, plus:',
      'Unlimited analyses & video duration',
      'Batch processing (100+ files)',
      'Webhook notifications',
      'White-label reports',
      'Custom model fine-tuning',
      'On-premise deployment option',
      'SSO/SAML integration',
      '99.9% SLA',
      'Dedicated account manager',
      '24/7 phone support',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact?inquiry=enterprise',
    highlighted: false,
  },
];

const comparisonCategories = [
  {
    name: 'Analysis',
    features: [
      { name: 'Monthly quota', free: '25', pro: '500', enterprise: 'Unlimited' },
      { name: 'Image analysis', free: true, pro: true, enterprise: true },
      { name: 'Video analysis', free: 'Up to 20 sec', pro: 'Up to 5 min', enterprise: 'Unlimited' },
      { name: 'Batch processing', free: false, pro: false, enterprise: '100+ files' },
    ],
  },
  {
    name: 'Detection Capabilities',
    features: [
      { name: 'AI-generated images', free: true, pro: true, enterprise: true },
      { name: 'Deepfake detection', free: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
      { name: 'Voice clone detection', free: false, pro: true, enterprise: true },
      { name: 'Partial edit detection', free: false, pro: true, enterprise: true },
    ],
  },
  {
    name: 'Reports & Output',
    features: [
      { name: 'Verdict & confidence', free: true, pro: true, enterprise: true },
      { name: 'Heatmap visualizations', free: false, pro: true, enterprise: true },
      { name: 'Detailed forensics', free: false, pro: true, enterprise: true },
      { name: 'Export (PDF/JSON)', free: false, pro: true, enterprise: true },
      { name: 'White-label reports', free: false, pro: false, enterprise: true },
    ],
  },
  {
    name: 'API & Integration',
    features: [
      { name: 'REST API access', free: false, pro: '500 calls/mo', enterprise: 'Unlimited' },
      { name: 'Webhook notifications', free: false, pro: false, enterprise: true },
      { name: 'SSO/SAML', free: false, pro: false, enterprise: true },
      { name: 'On-premise deployment', free: false, pro: false, enterprise: true },
    ],
  },
  {
    name: 'Support & SLA',
    features: [
      { name: 'Result retention', free: '72 hours', pro: '1 year', enterprise: 'Custom' },
      { name: 'Support level', free: 'Community', pro: 'Email', enterprise: '24/7 Phone' },
      { name: 'SLA', free: false, pro: false, enterprise: '99.9%' },
      { name: 'Dedicated account manager', free: false, pro: false, enterprise: true },
    ],
  },
];

const faqs = [
  {
    question: 'What counts as one analysis?',
    answer: 'One analysis is counted each time you submit a file (image or video) for detection. Re-analyzing the same file counts as a new analysis. Batch uploads count each file individually.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes, you can change your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the change takes effect at the start of your next billing cycle.',
  },
  {
    question: 'What file formats do you support?',
    answer: 'We support all major image formats (JPEG, PNG, WebP, GIF, HEIC) and video formats (MP4, MOV, AVI, WebM). Maximum file sizes are 25MB for images and 500MB for videos (Pro) or 2GB (Enterprise).',
  },
  {
    question: 'How accurate is your detection?',
    answer: 'Our multi-model ensemble achieves 97%+ accuracy on benchmark datasets. Detection rates vary by content type—we excel at identifying diffusion models (Midjourney, DALL-E, Stable Diffusion) and face swaps (DeepFaceLab, SimSwap).',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All uploads are encrypted in transit (TLS 1.3) and at rest (AES-256). We process files in isolated environments and automatically delete them according to your plan\'s retention policy. We\'re SOC 2 Type II compliant.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a full refund within 14 days of your first payment if you\'re not satisfied. Annual plans can be refunded prorated within 30 days. Contact support to request a refund.',
  },
  {
    question: 'What happens if I exceed my quota?',
    answer: 'You\'ll receive warnings at 80% and 100% usage. Free tier users are blocked until the next month. Pro users can purchase additional analysis packs ($10 for 100 analyses) or upgrade to Enterprise.',
  },
  {
    question: 'Can I try Pro features before subscribing?',
    answer: 'Yes! Pro includes a 14-day free trial with full access to all features. No credit card required to start. You\'ll only be charged if you choose to continue after the trial.',
  },
];

// ============ Components ============

function PricingCard({
  tier,
  billingPeriod,
}: {
  tier: typeof tiers[0];
  billingPeriod: 'monthly' | 'annual';
}) {
  const price = tier.price[billingPeriod];
  const isCustom = price === null;

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-white dark:bg-slate-800 p-8 flex flex-col',
        tier.highlighted
          ? 'border-primary shadow-lg ring-2 ring-primary'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {tier.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold">{tier.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
      </div>

      <div className="mb-6">
        {isCustom ? (
          <div className="text-4xl font-bold">Custom</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">${price}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
        )}
        {billingPeriod === 'annual' && !isCustom && price > 0 && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Save ${(tier.price.monthly - tier.price.annual) * 12}/year
          </p>
        )}
        <p className="mt-2 text-sm font-medium text-muted-foreground">{tier.quota}</p>
        {tier.trialBadge && (
          <p className="mt-1 text-sm text-primary font-medium">{tier.trialBadge}</p>
        )}
      </div>

      <ul className="mb-8 space-y-3 flex-1">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link href={tier.ctaLink}>
        <Button
          className="w-full gap-2"
          variant={tier.highlighted ? 'default' : 'outline'}
          size="lg"
        >
          {tier.cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function FeatureComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b">
            <th className="text-left py-4 px-4 font-medium">Features</th>
            <th className="text-center py-4 px-4 font-medium w-32">Free</th>
            <th className="text-center py-4 px-4 font-medium w-32 bg-primary/5">Pro</th>
            <th className="text-center py-4 px-4 font-medium w-32">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {comparisonCategories.map((category) => (
            <>
              <tr key={category.name} className="border-b bg-slate-50 dark:bg-slate-900">
                <td colSpan={4} className="py-3 px-4 font-semibold text-sm">
                  {category.name}
                </td>
              </tr>
              {category.features.map((feature, i) => (
                <tr key={`${category.name}-${i}`} className="border-b">
                  <td className="py-3 px-4 text-sm">{feature.name}</td>
                  <td className="py-3 px-4 text-center">
                    <FeatureValue value={feature.free} />
                  </td>
                  <td className="py-3 px-4 text-center bg-primary/5">
                    <FeatureValue value={feature.pro} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <FeatureValue value={feature.enterprise} />
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-green-500 mx-auto" />;
  }
  if (value === false) {
    return <X className="h-5 w-5 text-slate-300 dark:text-slate-600 mx-auto" />;
  }
  return <span className="text-sm">{value}</span>;
}

function FAQItem({
  faq,
  isExpanded,
  onToggle,
}: {
  faq: typeof faqs[0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-medium">{faq.question}</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="pb-4 text-muted-foreground">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

// ============ Main Page ============

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

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
              <Link href="/pricing" className="text-foreground font-medium transition">
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Start free and scale as you grow. No hidden fees, no surprises.
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              'text-sm font-medium',
              billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              billingPeriod === 'annual' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm font-medium',
              billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Annual
          </span>
          {billingPeriod === 'annual' && (
            <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
              Save 17%
            </span>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} billingPeriod={billingPeriod} />
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="bg-slate-50 dark:bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm">
            <FeatureComparisonTable />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-6">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isExpanded={expandedFAQ === i}
              onToggle={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Ready to verify your content?</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-2xl mx-auto">
            Start detecting AI-generated content today with our free tier.
            No credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

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
