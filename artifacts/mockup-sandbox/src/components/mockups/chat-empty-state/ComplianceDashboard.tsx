import "./_group.css";
import { ChatShell } from "./_shared/ChatShell";
import { Activity, Clock, MessageSquare, AlertCircle, FileText, Sparkles } from "lucide-react";

export function ComplianceDashboard() {
  return (
    <ChatShell
      inputPlaceholder="Ask anything about NHS compliance..."
      showInput={true}
    >
      <div className="flex flex-col w-full max-w-4xl mx-auto px-6 py-8 pb-12 gap-10 text-[var(--rv-text)] font-[var(--rv-font)]">
        
        {/* Greeting Section */}
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--rv-text)]">
            Welcome back, Dr. Aris Thorne
          </h1>
          <div className="inline-flex items-center w-fit gap-2 px-2.5 py-1.5 rounded-md bg-[var(--rv-surface)] border border-[var(--rv-border)] text-xs text-[var(--rv-muted-light)] font-medium">
            <div className="w-2 h-2 rounded-full bg-[var(--rv-accent)] shadow-[0_0_8px_var(--rv-accent-text)]"></div>
            King's College Hospital · Clinical Governance
          </div>
        </div>

        {/* Pulse / Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] shadow-sm hover:border-[var(--rv-border)] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[var(--rv-accent)]" />
              <span className="text-[0.65rem] font-bold text-[var(--rv-muted)] uppercase tracking-wider">Activity</span>
            </div>
            <div className="text-3xl font-semibold mb-1 text-[var(--rv-text)] tracking-tight">14</div>
            <div className="text-[0.7rem] text-[var(--rv-muted-light)]">Conversations this month</div>
          </div>
          
          <div className="flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[var(--rv-accent)]" />
              <span className="text-[0.65rem] font-bold text-[var(--rv-muted)] uppercase tracking-wider">Reviews</span>
            </div>
            <div className="text-3xl font-semibold mb-1 text-[var(--rv-text)] tracking-tight">4</div>
            <div className="text-[0.7rem] text-[var(--rv-muted-light)]">KLOEs reviewed this week</div>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-[var(--rv-error)] opacity-90" />
              <span className="text-[0.65rem] font-bold text-[var(--rv-muted)] uppercase tracking-wider">Action Required</span>
            </div>
            <div className="text-3xl font-semibold mb-1 text-[var(--rv-text)] tracking-tight">2</div>
            <div className="text-[0.7rem] text-[var(--rv-muted-light)]">Open audit threads</div>
          </div>

          <div className="flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] shadow-sm justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[var(--rv-accent)]" />
              <span className="text-[0.65rem] font-bold text-[var(--rv-muted)] uppercase tracking-wider">Focus Area</span>
            </div>
            <div className="text-sm font-medium leading-snug text-[var(--rv-text)] mt-1">Infection control policies</div>
            <div className="text-[0.7rem] text-[var(--rv-muted-light)] mt-2">Last active topic</div>
          </div>
        </div>

        {/* Continue Where You Left Off */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[0.75rem] font-bold text-[var(--rv-muted-light)] uppercase tracking-widest">Continue where you left off</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="text-left group flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm relative">
              <div className="flex items-start justify-between mb-3 w-full gap-2">
                <h3 className="text-sm font-semibold leading-tight text-[var(--rv-text)] group-hover:text-[var(--rv-accent-text)] transition-colors">Medication safety audit prep</h3>
                <span className="text-[0.65rem] font-medium text-[var(--rv-muted)] whitespace-nowrap bg-[var(--rv-surface)] px-1.5 py-0.5 rounded border border-[var(--rv-border)] flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> 2h ago</span>
              </div>
              <p className="text-[0.8rem] text-[var(--rv-muted-light)] line-clamp-2 leading-relaxed">
                Based on the recent CQC guidelines, the ward will need to demonstrate clear evidence of daily temperature checks for the medication fridge...
              </p>
            </button>
            
            <button className="text-left group flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm relative">
              <div className="flex items-start justify-between mb-3 w-full gap-2">
                <h3 className="text-sm font-semibold leading-tight text-[var(--rv-text)] group-hover:text-[var(--rv-accent-text)] transition-colors">DoLS application wording</h3>
                <span className="text-[0.65rem] font-medium text-[var(--rv-muted)] whitespace-nowrap bg-[var(--rv-surface)] px-1.5 py-0.5 rounded border border-[var(--rv-border)] flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> Yesterday</span>
              </div>
              <p className="text-[0.8rem] text-[var(--rv-muted-light)] line-clamp-2 leading-relaxed">
                I've drafted the mental capacity assessment summary. Make sure to emphasize that all less restrictive options were explored before submitting...
              </p>
            </button>

            <button className="text-left group flex flex-col p-4 rounded-xl bg-[var(--rv-card)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm relative">
              <div className="flex items-start justify-between mb-3 w-full gap-2">
                <h3 className="text-sm font-semibold leading-tight text-[var(--rv-text)] group-hover:text-[var(--rv-accent-text)] transition-colors">Safeguarding referral review</h3>
                <span className="text-[0.65rem] font-medium text-[var(--rv-muted)] whitespace-nowrap bg-[var(--rv-surface)] px-1.5 py-0.5 rounded border border-[var(--rv-border)] flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> Wed</span>
              </div>
              <p className="text-[0.8rem] text-[var(--rv-muted-light)] line-clamp-2 leading-relaxed">
                Yes, neglect falls under the Care Act 2014 criteria for safeguarding. You should immediately report this to the local authority safeguarding team...
              </p>
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--rv-accent)]" />
            <h2 className="text-[0.85rem] font-semibold text-[var(--rv-text)] tracking-wide">Quick Prompts</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 rv-scroll -mx-2 px-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--rv-surface)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent-dim)] hover:text-[var(--rv-accent-text)] text-[0.8rem] font-medium text-[var(--rv-text)] transition-colors whitespace-nowrap shadow-sm">
              Latest CQC inspection report changes
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--rv-surface)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent-dim)] hover:text-[var(--rv-accent-text)] text-[0.8rem] font-medium text-[var(--rv-text)] transition-colors whitespace-nowrap shadow-sm">
              Updated safeguarding thresholds 2026
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--rv-surface)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent-dim)] hover:text-[var(--rv-accent-text)] text-[0.8rem] font-medium text-[var(--rv-text)] transition-colors whitespace-nowrap shadow-sm">
              Draft duty of candour letter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--rv-surface)] border border-[var(--rv-border)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent-dim)] hover:text-[var(--rv-accent-text)] text-[0.8rem] font-medium text-[var(--rv-text)] transition-colors whitespace-nowrap shadow-sm">
              Summarise NICE guidelines on falls
            </button>
          </div>
        </div>
        
      </div>
    </ChatShell>
  );
}
