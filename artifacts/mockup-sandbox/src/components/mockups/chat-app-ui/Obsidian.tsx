import React, { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export function Obsidian() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
          
          .font-space {
            font-family: 'Space Grotesk', sans-serif;
          }
          
          .neon-grid {
            background-size: 40px 40px;
            background-image: 
              linear-gradient(to right, rgba(0, 255, 136, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 255, 136, 0.08) 1px, transparent 1px);
          }
        `}
      </style>
      <div className="min-h-screen w-full flex overflow-hidden bg-[#000000] font-space text-white">
        {/* Left Side: Bold Identity Area */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 lg:p-20 border-r border-[#00ff88]/20 relative overflow-hidden bg-[#0a0a0a]">
          {/* Abstract Geometric Pattern */}
          <div className="absolute inset-0 neon-grid" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-10 pointer-events-none flex items-center justify-center">
             <div className="w-full h-full border-[1px] border-[#00ff88] rotate-45 transform scale-150"></div>
             <div className="absolute w-full h-full border-[1px] border-[#00ff88] rotate-[25deg] transform scale-125"></div>
             <div className="absolute w-full h-full border-[1px] border-[#00ff88] -rotate-[15deg] transform scale-110"></div>
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 flex items-center justify-center border border-[#00ff88] bg-black mb-8">
              <span className="text-[#00ff88] font-bold tracking-wider text-lg">CH</span>
            </div>
            
            <h2 className="text-[#00ff88] text-xs font-bold tracking-[0.3em] uppercase mb-4">
              Compliance House
            </h2>
          </div>

          <div className="relative z-10 flex-grow flex items-center">
            <div className="text-[12rem] xl:text-[16rem] font-bold text-transparent leading-none select-none"
                 style={{ WebkitTextStroke: '1px rgba(0, 255, 136, 0.15)' }}>
              NHS<br/>AI
            </div>
          </div>
          
          <div className="relative z-10 text-gray-500 text-sm max-w-md">
            System version 2.4.1. Secure access for authorized National Health Service personnel only.
          </div>
        </div>

        {/* Right Side: Form Area */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-[#000000] relative">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden flex flex-col mb-12">
              <div className="w-10 h-10 flex items-center justify-center border border-[#00ff88] bg-black mb-6">
                <span className="text-[#00ff88] font-bold tracking-wider">CH</span>
              </div>
              <h2 className="text-[#00ff88] text-xs font-bold tracking-[0.3em] uppercase">
                Compliance House
              </h2>
            </div>

            <div className="mb-16">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">System Access</h1>
              <p className="text-gray-400 text-sm">Enter your credentials to access the secure NHS compliance environment.</p>
            </div>

            <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
              <div className="relative group">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00ff88] transition-colors">
                  <Mail size={18} strokeWidth={2} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="NHS Email Address" 
                  className="w-full bg-transparent border-b border-[#00ff88]/30 py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88] transition-colors rounded-none"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00ff88] transition-colors">
                  <Lock size={18} strokeWidth={2} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
                  className="w-full bg-transparent border-b border-[#00ff88]/30 py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88] transition-colors rounded-none"
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-[#00ff88]/50 group-hover:border-[#00ff88] bg-transparent">
                    <input type="checkbox" className="absolute opacity-0 w-full h-full cursor-pointer peer" />
                    <div className="hidden peer-checked:block w-2 h-2 bg-[#00ff88]"></div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-300">Remember device</span>
                </label>
                <a href="#" className="text-xs text-[#00ff88] hover:text-white transition-colors">
                  Recover access
                </a>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-[#00ff88] hover:bg-white text-black font-bold py-4 px-6 transition-all duration-300 flex items-center justify-center gap-3 rounded-none group"
                >
                  <span className="tracking-wide">AUTHENTICATE</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="mt-6 text-center border-t border-[#00ff88]/10 pt-6">
                  <p className="text-[#00ff88]/60 text-xs tracking-wider uppercase font-medium">
                    Trusted by 10,000+ NHS professionals
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
