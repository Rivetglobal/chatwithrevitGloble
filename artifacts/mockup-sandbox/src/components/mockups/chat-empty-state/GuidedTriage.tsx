import { useState } from "react";
import { 
  FileSearch, 
  ShieldCheck, 
  BookOpen, 
  ArrowRight,
  MessageSquare
} from "lucide-react";
import "./_group.css";
import { ChatShell } from "./_shared/ChatShell";

export function GuidedTriage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const cards = [
    {
      id: 1,
      icon: <BookOpen className="w-6 h-6" />,
      title: "Decode a regulation",
      description: "Ask about specific NICE guidelines, CQC KLOEs, or complex frameworks like DoLS.",
    },
    {
      id: 2,
      icon: <FileSearch className="w-6 h-6" />,
      title: "Audit a document or policy",
      description: "Upload care plans, risk assessments, or audit reports for a compliance review.",
    },
    {
      id: 3,
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Prep for an inspection",
      description: "Generate checklists and mock questions based on the latest CQC inspection framework.",
    }
  ];

  return (
    <ChatShell showInput={false}>
      <div className="flex flex-col items-center justify-center w-full h-full px-6 py-12">
        <div className="max-w-4xl w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--rv-text)" }}>
              What can I help with today?
            </h1>
            <p className="text-base sm:text-lg" style={{ color: "var(--rv-muted-light)" }}>
              Choose a path below to start a guided intake, tailored for NHS compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-10">
            {cards.map((card, index) => (
              <button
                key={card.id}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className="group flex flex-col items-start text-left p-6 rounded-xl transition-all duration-300 ease-out border outline-none"
                style={{
                  backgroundColor: hoveredCard === index ? "var(--rv-card-hover)" : "var(--rv-card)",
                  borderColor: hoveredCard === index ? "var(--rv-accent)" : "var(--rv-border)",
                  transform: hoveredCard === index ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: hoveredCard === index ? "0 10px 30px -10px rgba(0,0,0,0.5)" : "none",
                }}
              >
                <div 
                  className="mb-5 p-3 rounded-lg transition-colors duration-300"
                  style={{ 
                    backgroundColor: hoveredCard === index ? "var(--rv-accent-dim)" : "var(--rv-surface)",
                    color: hoveredCard === index ? "var(--rv-accent-text)" : "var(--rv-muted-light)"
                  }}
                >
                  {card.icon}
                </div>
                
                <h3 className="text-lg font-semibold mb-2 transition-colors duration-300" 
                    style={{ color: hoveredCard === index ? "var(--rv-text)" : "var(--rv-text)" }}>
                  {card.title}
                </h3>
                
                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "var(--rv-muted)" }}>
                  {card.description}
                </p>

                <div className="flex items-center gap-2 text-sm font-medium transition-all duration-300 mt-auto"
                     style={{ 
                       color: hoveredCard === index ? "var(--rv-accent)" : "var(--rv-muted)",
                       transform: hoveredCard === index ? "translateX(4px)" : "translateX(0)"
                     }}>
                  Start path <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <button 
            className="group flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors duration-200"
            style={{ 
              color: "var(--rv-muted-light)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--rv-text)";
              e.currentTarget.style.backgroundColor = "var(--rv-card)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--rv-muted-light)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <MessageSquare className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            <span>Or skip the guide and ask freely</span>
          </button>

        </div>
      </div>
    </ChatShell>
  );
}
