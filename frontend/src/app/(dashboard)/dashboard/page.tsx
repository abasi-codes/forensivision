'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  Key,
  BarChart3,
  FileImage,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function DashboardPage() {
  const [user] = useState({
    name: 'Demo User',
    email: 'demo@example.com',
    tier: 'free',
  });

  const [stats] = useState({
    analysesThisMonth: 12,
    quota: 25,
    lastAnalysis: '2 hours ago',
  });

  const [recentAnalyses] = useState([
    {
      id: '1',
      fileName: 'photo_2026_01.jpg',
      type: 'image',
      verdict: 'ai_generated',
      confidence: 0.94,
      createdAt: '2026-02-02T10:30:00Z',
    },
    {
      id: '2',
      fileName: 'profile_picture.png',
      type: 'image',
      verdict: 'authentic',
      confidence: 0.88,
      createdAt: '2026-02-01T15:45:00Z',
    },
    {
      id: '3',
      fileName: 'artwork.jpg',
      type: 'image',
      verdict: 'likely_ai',
      confidence: 0.72,
      createdAt: '2026-02-01T09:20:00Z',
    },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <Logo size={32} />
          <span className="text-xl font-bold">ForensiVision</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<BarChart3 />} label="Dashboard" href="/dashboard" active />
          <NavItem icon={<Upload />} label="New Analysis" href="/dashboard/analyze" />
          <NavItem icon={<FileImage />} label="Results" href="/dashboard/results" />
          <NavItem icon={<Key />} label="API Keys" href="/dashboard/api-keys" />
          <NavItem icon={<Settings />} label="Settings" href="/dashboard/settings" />
        </nav>

        <div className="border-t pt-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-sm font-medium">Free Plan</p>
            <p className="text-xs text-muted-foreground">
              {stats.analysesThisMonth}/{stats.quota} analyses used
            </p>
            <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(stats.analysesThisMonth / stats.quota) * 100}%` }}
              />
            </div>
            <Link href="/pricing">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                Upgrade Plan
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your content verification
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={<FileImage className="h-5 w-5" />}
              label="Analyses This Month"
              value={stats.analysesThisMonth}
              subtext={`of ${stats.quota} quota`}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Last Analysis"
              value={stats.lastAnalysis}
              subtext="ago"
            />
            <StatCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Detection Rate"
              value="67%"
              subtext="AI content found"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link href="/dashboard/analyze">
              <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 hover:border-primary transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">New Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload an image or video to analyze
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/api-keys">
              <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 hover:border-primary transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">API Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Get your API keys for programmatic access
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Analyses */}
          <div className="bg-white dark:bg-slate-900 border rounded-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Recent Analyses</h2>
              <Link href="/dashboard/results">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            <div className="divide-y">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  href={`/dashboard/results/${analysis.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <FileImage className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{analysis.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <VerdictBadge verdict={analysis.verdict} confidence={analysis.confidence} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  href,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{subtext}</p>
    </div>
  );
}

function VerdictBadge({ verdict, confidence }: { verdict: string; confidence: number }) {
  const isAI = verdict === 'ai_generated' || verdict === 'likely_ai' || verdict === 'manipulated';
  const isAuthentic = verdict === 'authentic' || verdict === 'likely_authentic';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        isAI
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : isAuthentic
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      }`}
    >
      {isAI ? (
        <AlertCircle className="h-4 w-4" />
      ) : isAuthentic ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span>{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
}
