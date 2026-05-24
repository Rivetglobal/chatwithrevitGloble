import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Users, FileCheck2, Diamond } from 'lucide-react';

export function Nebula() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden font-['Inter'] relative bg-[#1a0533]">
      {/* Background with lush multi-layered gradient */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep plum to royal purple gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#4a1277] via-[#2d0a4e] to-[#1a0533]"></div>
        
        {/* Glowing amber orb top right */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-[#f59e0b]/20 rounded-full blur-[120px] mix-blend-screen"></div>
      </div>

      {/* Left Panel (55%) */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between w-[55%] border-r border-[#a855f7]/50 bg-[#2d0a4e]/40 p-16 xl:p-24 backdrop-blur-sm">
        <div className="flex-1 flex flex-col justify-center max-w-2xl">
          {/* Logo / Wordmark */}
          <h1 className="text-5xl xl:text-7xl font-['Playfair_Display'] text-white leading-tight tracking-tight mb-8">
            Compliance
            <br />
            <span className="italic text-[#d8b4fe]">House</span>
          </h1>

          {/* Decorative Rule with Diamond */}
          <div className="flex items-center gap-4 mb-8 opacity-70">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#a855f7]"></div>
            <Diamond className="w-4 h-4 text-[#a855f7] fill-current" />
            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#a855f7] to-transparent"></div>
          </div>

          {/* Subheading */}
          <p className="text-xl xl:text-2xl font-['Playfair_Display'] italic text-[#e9d5ff] font-light leading-relaxed mb-16">
            Empowering NHS professionals with AI-driven compliance intelligence.
          </p>
        </div>

        {/* Bottom Stat Pills */}
        <div className="flex flex-wrap gap-4 mt-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#a855f7]/40 bg-[#1a0533]/40 text-[#e9d5ff] text-sm backdrop-blur-md">
            <Users className="w-4 h-4 text-[#a855f7]" />
            <span>10K+ Users</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#a855f7]/40 bg-[#1a0533]/40 text-[#e9d5ff] text-sm backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-[#a855f7]" />
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#a855f7]/40 bg-[#1a0533]/40 text-[#e9d5ff] text-sm backdrop-blur-md">
            <FileCheck2 className="w-4 h-4 text-[#a855f7]" />
            <span>NHS Approved</span>
          </div>
        </div>
      </div>

      {/* Right Panel (45%) */}
      <div className="relative z-10 w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-16 lg:p-20 xl:p-24 bg-[#f8f4ff]">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Header (Hidden on large screens) */}
          <div className="lg:hidden mb-12 text-center">
            <h1 className="text-4xl font-['Playfair_Display'] text-[#4a1277] mb-2">
              Compliance <span className="italic">House</span>
            </h1>
            <p className="text-[#6b21a8] text-sm font-medium">NHS AI Intelligence</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-['Playfair_Display'] font-semibold text-[#1a0533] mb-3">
              Welcome back
            </h2>
            <p className="text-[#6b21a8]">
              Sign in to access your compliance dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-[#4a1277]"
              >
                NHS Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-[#d8b4fe] rounded-lg text-[#1a0533] placeholder:text-[#a855f7]/60 focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent transition-all shadow-sm"
                placeholder="dr.smith@nhs.net"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-[#4a1277]"
                >
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-[#7c3aed] hover:text-[#5b21b6] transition-colors">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-[#d8b4fe] rounded-lg text-[#1a0533] placeholder:text-[#a855f7]/60 focus:outline-none focus:ring-2 focus:ring-[#a855f7] focus:border-transparent transition-all shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="group w-full flex items-center justify-between px-6 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[#6b21a8] text-sm">
              New to Compliance House?{' '}
              <a href="#" className="font-semibold text-[#7c3aed] hover:text-[#5b21b6] transition-colors hover:underline underline-offset-4">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
