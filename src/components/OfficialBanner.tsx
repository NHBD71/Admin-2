import React from "react";
import { Shield } from "lucide-react";

export function OfficialBanner() {
  return (
    <div 
      id="official-brand-banner"
      className="w-full bg-[#f17b1b] rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center border-t-4 border-black text-center select-none"
    >
      {/* Dynamic background sport patterns */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Logo and Wordmark Row */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
          
          {/* Stylized "9" Cricket Ball Logo Group */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-[#111111] rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 duration-300">
              
              {/* Swooping Sports Lines / Cricket Seams */}
              <svg 
                className="absolute inset-0 w-full h-full text-[#f17b1b]" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Sweat/Swoosh lines to mimic the sporty look */}
                <path 
                  d="M 12,35 C 25,20 75,20 88,35" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  opacity="0.8" 
                />
                <path 
                  d="M 12,65 C 25,80 75,80 88,65" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  opacity="0.8" 
                />
                <path 
                  d="M 5,50 C 20,40 80,40 95,50" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                  opacity="0.5" 
                />
              </svg>
              
              {/* Big Bold "9" numeral */}
              <span className="text-4xl md:text-5xl font-black italic tracking-tighter text-[#f17b1b] select-none font-sans mt-0.5 ml-0.5">
                9
              </span>
            </div>

            {/* Wordmark (W|||CKETS.WIN) */}
            <div className="flex flex-col items-start justify-center">
              <div 
                className="flex items-center text-black font-black italic text-3xl md:text-5xl tracking-tighter uppercase font-sans select-none"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <span>W</span>
                
                {/* Dynamic Wickets in place of 'I' */}
                <span className="inline-flex gap-0.5 md:gap-1 mx-1.5 h-8 md:h-11 items-end transform -skew-x-12 select-none">
                  <span className="w-1.5 md:w-2 h-full bg-black rounded-[1px]"></span>
                  <span className="w-1.5 md:w-2 h-full bg-black rounded-[1px]"></span>
                  <span className="w-1.5 md:w-2 h-full bg-black rounded-[1px]"></span>
                </span>
                
                <span>CKETS.WIN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bengali Agent Subtitle Row */}
        <div className="mt-1">
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#ffffff] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] px-8 py-2 md:py-3 rounded-2xl bg-black/15 border border-white/10 inline-block">
            অফিসিয়াল এজেন্ট লিস্ট
          </h2>
        </div>
      </div>
    </div>
  );
}
