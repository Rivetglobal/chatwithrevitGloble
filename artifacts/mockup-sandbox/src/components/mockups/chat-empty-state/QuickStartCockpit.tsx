import "./_group.css";
import { ChatShell } from "./_shared/ChatShell";
import { 
  ClipboardCheck, 
  FileSearch, 
  BookOpen, 
  ShieldAlert, 
  FileText, 
  CheckCircle2 
} from "lucide-react";

export function QuickStartCockpit() {
  const prompts = [
    {
      title: "Prep for a CQC inspection",
      description: "Generate a mock interview or review your evidence.",
      icon: <ClipboardCheck className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
    {
      title: "Audit a medication policy",
      description: "Check for compliance with NICE guidelines.",
      icon: <FileSearch className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
    {
      title: "Decode a KLOE",
      description: "Break down Safe, Effective, Caring, Responsive, or Well-led.",
      icon: <BookOpen className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
    {
      title: "Draft a safeguarding referral",
      description: "Structure a clear, factual report for the local authority.",
      icon: <ShieldAlert className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
    {
      title: "Summarise a regulation",
      description: "Get the key points of the Health and Social Care Act.",
      icon: <FileText className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
    {
      title: "Generate evidence for Well-led",
      description: "Identify gaps in your governance framework.",
      icon: <CheckCircle2 className="w-5 h-5 text-[var(--rv-accent-text)]" />,
    },
  ];

  return (
    <ChatShell inputPlaceholder="Ask anything about NHS compliance..." showInput={true}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center mb-10">
          <h1 className="text-2xl font-semibold text-[var(--rv-text)] tracking-tight mb-2">
            Your NHS compliance copilot
          </h1>
          <p className="text-[var(--rv-muted-light)] text-sm">
            Pick a task to get started, or just ask.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-8">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              className="flex flex-col items-start text-left p-5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-card)] hover:bg-[var(--rv-card-hover)] hover:border-[var(--rv-accent)] hover:-translate-y-0.5 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[var(--rv-accent)] focus:ring-offset-2 focus:ring-offset-[var(--rv-bg)]"
            >
              <div className="p-2 rounded-lg bg-[var(--rv-accent-dim)] mb-4">
                {prompt.icon}
              </div>
              <h3 className="text-[var(--rv-text)] font-medium text-sm mb-1.5 group-hover:text-[var(--rv-accent-text)] transition-colors">
                {prompt.title}
              </h3>
              <p className="text-[var(--rv-muted)] text-xs leading-relaxed">
                {prompt.description}
              </p>
            </button>
          ))}
        </div>

        <div className="text-center mt-4">
          <p className="text-[11px] text-[var(--rv-muted)] uppercase tracking-wider font-medium">
            Or just type your question below
          </p>
        </div>
      </div>
    </ChatShell>
  );
}
