import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function Aurora() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@400;600;700&display=swap');
          
          @keyframes drift-slow {
            0% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
            33% { transform: translate(30px, -50px) scale(1.1); opacity: 0.8; }
            66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
            100% { transform: translate(0px, 0px) scale(1); opacity: 0.6; }
          }
          
          @keyframes drift-slower {
            0% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.4; }
            50% { transform: translate(-40px, 60px) scale(1.2) rotate(10deg); opacity: 0.7; }
            100% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.4; }
          }
          
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }

          .animate-drift-slow {
            animation: drift-slow 15s ease-in-out infinite;
          }
          
          .animate-drift-slower {
            animation: drift-slower 20s ease-in-out infinite;
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `}
      </style>
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050816] font-['Inter'] text-slate-300 selection:bg-[#00c9c8]/30">
        
        {/* Deep Space Background Layer */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a0f2e] via-[#050816] to-[#050816]"></div>

        {/* Aurora Bands & Glowing Orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00c9c8] rounded-full mix-blend-screen filter blur-[120px] animate-drift-slow opacity-30"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[150px] animate-drift-slower opacity-20"></div>
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[40%] bg-[#00c9c8] rounded-full mix-blend-screen filter blur-[100px] animate-drift-slow opacity-20" style={{ animationDelay: '5s' }}></div>
          
          {/* Subtle star-like noise overlay (optional, keeping it clean with gradients primarily) */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        </div>

        {/* Glassmorphic Card */}
        <div className="relative z-10 w-full max-w-md px-6 sm:px-0 animate-float">
          <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/[0.1] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            
            {/* Soft inner shadow highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-3xl"></div>

            {/* Logo area */}
            <div className="flex justify-center mb-8 relative z-20">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#00c9c8]/20 to-[#00c9c8]/5 p-2 rounded-xl border border-[#00c9c8]/30 shadow-[0_0_15px_rgba(0,201,200,0.2)]">
                  <ShieldCheck className="w-8 h-8 text-[#00c9c8]" strokeWidth={1.5} />
                </div>
                <span className="font-['Sora'] font-semibold text-xl tracking-wide text-white">
                  Compliance<span className="text-[#00c9c8]">House</span>
                </span>
              </div>
            </div>

            {/* Typography */}
            <div className="text-center mb-10 relative z-20">
              <h1 className="font-['Sora'] text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                Your NHS Compliance Partner
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                Sign in to access your AI-powered compliance assistant
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5 relative z-20" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-[#00c9c8] transition-colors" />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder-white/20 focus:border-[#00c9c8]/50 focus:ring-1 focus:ring-[#00c9c8]/50 focus:bg-black/40 transition-all outline-none"
                    placeholder="doctor@nhs.net"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-[#00c9c8] hover:text-[#22d3ee] transition-colors">Forgot?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-[#00c9c8] transition-colors" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-black/20 border border-white/5 rounded-xl text-white placeholder-white/20 focus:border-[#00c9c8]/50 focus:ring-1 focus:ring-[#00c9c8]/50 focus:bg-black/40 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-8 py-3.5 px-4 bg-gradient-to-r from-[#00c9c8] to-[#22d3ee] hover:from-[#00b0b0] hover:to-[#00c9c8] text-[#050816] font-['Sora'] font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(0,201,200,0.2)] hover:shadow-[0_0_25px_rgba(0,201,200,0.5)] hover:-translate-y-0.5 flex justify-center items-center gap-2 group"
              >
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-8 text-center relative z-20">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <a href="#" className="text-[#00c9c8] hover:text-[#22d3ee] font-medium transition-colors hover:underline underline-offset-4">
                  Create account
                </a>
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
