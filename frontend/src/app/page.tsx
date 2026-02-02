'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Eye, FileCheck, Upload, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { QuickUpload } from '@/components/landing/quick-upload';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-xl font-bold">ForensiVision</span>
            </div>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Detect AI-Generated
              <span className="text-primary block mt-2">Content Instantly</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              ForensiVision uses advanced machine learning to identify deepfakes,
              AI-generated images, and manipulated media with 97%+ accuracy.
              Protect your organization from synthetic content.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline">
                  View API Docs
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-500" />
                <span>25 free analyses/month</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Sub-second results</span>
              </div>
            </div>
          </div>

          {/* Quick Upload Widget */}
          <div className="lg:pl-8">
            <QuickUpload />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why ForensiVision?</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Industry-leading detection technology trusted by media organizations,
              enterprises, and security teams worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="97%+ Accuracy"
              description="Multi-model ensemble approach combining CNNs, Vision Transformers, and frequency analysis for industry-leading detection rates."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Real-Time Detection"
              description="Sub-second processing for images. Analyze content at the point of upload without slowing down your workflows."
            />
            <FeatureCard
              icon={<Eye className="h-6 w-6" />}
              title="Explainable Results"
              description="Visual heatmaps highlight suspicious regions. Detailed reports suitable for legal proceedings and compliance."
            />
          </div>
        </div>
      </section>

      {/* Detection Types */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">What We Detect</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive detection across all major AI generation and manipulation techniques.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetectionCard title="AI-Generated Images" sources="DALL-E, Midjourney, Stable Diffusion, FLUX" />
            <DetectionCard title="Face Swaps" sources="DeepFaceLab, FaceSwap, SimSwap, Roop" />
            <DetectionCard title="AI Videos" sources="Sora, Runway, Pika, Kling" />
            <DetectionCard title="Synthetic Faces" sources="StyleGAN, This Person Does Not Exist" />
            <DetectionCard title="Voice Clones" sources="ElevenLabs, Resemble AI, Voice.ai" />
            <DetectionCard title="Partial Edits" sources="Inpainting, object removal, manipulation" />
          </div>
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
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-semibold">ForensiVision</span>
            </div>
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border">
      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function DetectionCard({ title, sources }: { title: string; sources: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border hover:border-primary transition">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{sources}</p>
    </div>
  );
}
