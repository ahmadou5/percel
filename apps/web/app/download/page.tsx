import Link from 'next/link';
import { Download, ShieldCheck, CheckCircle2, AlertTriangle, Smartphone, ArrowLeft, FileText, Lock } from 'lucide-react';

export const metadata = {
  title: 'Download Percel APK - Android Mobile App',
  description: 'Download the official Percel Android APK directly. Safe, fast, and verified mobile delivery application for Nigeria.',
};

export default function DownloadPage() {
  const apkDownloadUrl =
    process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || '/downloads/percel-v1.0.0.apk';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Download Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-card/90 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Smartphone className="h-64 w-64 text-primary" />
        </div>

        <div className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Verified Official APK Build</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Download Percel for Android
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Get the latest version of Percel directly to your Android phone to book instant intra-state dispatches and track interstate deliveries across Nigeria.
          </p>

          {/* Release Specs */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/80 bg-slate-900/60 p-4 text-center text-xs font-semibold">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Version</p>
              <p className="mt-0.5 font-bold text-foreground">v1.0.4</p>
            </div>
            <div className="border-x border-border/60">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">File Size</p>
              <p className="mt-0.5 font-bold text-foreground">28.4 MB</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Android</p>
              <p className="mt-0.5 font-bold text-foreground">7.0 (Nougat)+</p>
            </div>
          </div>

          {/* Download Action */}
          <div className="pt-2">
            <a
              href={apkDownloadUrl}
              download="percel-latest.apk"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-extrabold text-white shadow-glow-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-5 w-5" />
              <span>Download APK Direct (28.4 MB)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Why APK Only Notice */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-xs text-amber-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Why is Percel installed via APK download?</span>
        </div>
        <p className="leading-relaxed">
          Percel is currently completing its final compliance review for Google Play Store listing in Nigeria. To ensure senders and riders can access logistics immediately, we provide our official, signed APK directly.
        </p>
      </div>

      {/* Installation Guide */}
      <div className="space-y-6 rounded-3xl border border-border/80 bg-card/80 p-8">
        <h2 className="text-xl font-extrabold text-foreground">
          Step-by-Step Android Installation Guide
        </h2>

        <div className="space-y-6">
          {[
            {
              step: '1',
              title: 'Download the APK file',
              desc: 'Tap the blue "Download APK Direct" button above. If your browser asks for download confirmation, select "Download Anyway".',
            },
            {
              step: '2',
              title: 'Enable Unknown Sources (if prompted)',
              desc: 'Go to your Android phone Settings → Security (or Apps & Notifications) → Enable "Install unknown apps" for Chrome or your preferred browser.',
            },
            {
              step: '3',
              title: 'Open and Install',
              desc: 'Open your Downloads manager or Notification drawer, tap percel-latest.apk, and select "Install".',
            },
            {
              step: '4',
              title: 'Launch & Login',
              desc: 'Open Percel from your home screen, complete quick phone number authentication, and start booking deliveries!',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary font-bold text-sm border border-primary/40">
                {item.step}
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* iOS Note */}
      <div className="rounded-2xl border border-border/80 bg-slate-900/60 p-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">Using iPhone or iOS?</h4>
          <p className="text-xs text-muted-foreground">
            Percel for iOS is currently in private TestFlight beta. Join the waitlist to receive an early invitation link.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
          iOS Coming Soon
        </span>
      </div>
    </div>
  );
}
