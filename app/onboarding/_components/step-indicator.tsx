import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepState = "complete" | "active" | "upcoming";

function Dot({ state, numeral }: { state: StepState; numeral: number }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
        state === "active" &&
          "border-transparent bg-[var(--yellow)] font-display text-[#0A0A0A]",
        state === "complete" && "border-[var(--yellow)] bg-transparent",
        state === "upcoming" &&
          "border-[var(--border)] bg-transparent text-[var(--text-muted)]",
      )}
    >
      {state === "complete" ? (
        <Check
          size={16}
          strokeWidth={1.75}
          className="text-[var(--yellow)]"
          aria-hidden="true"
        />
      ) : (
        <span className="font-display">{numeral}</span>
      )}
    </div>
  );
}

// 2-step horizontal indicator shared by both onboarding steps (design §2.F).
export function StepIndicator({ current }: { current: 1 | 2 }) {
  const step1: StepState = current > 1 ? "complete" : "active";
  const step2: StepState = current >= 2 ? "active" : "upcoming";

  return (
    <div className="mb-8">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Langkah {current} dari 2
      </p>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <Dot state={step1} numeral={1} />
          <span className="text-xs font-medium text-[var(--text)]">
            Bisnis
          </span>
        </div>

        <div
          className={cn(
            "h-px flex-1",
            current >= 2 ? "bg-[var(--yellow)]" : "bg-[var(--border)]",
          )}
        />

        <div className="flex flex-col items-center gap-1.5">
          <Dot state={step2} numeral={2} />
          <span
            className={cn(
              "text-xs",
              step2 === "upcoming"
                ? "text-[var(--text-muted)]"
                : "font-medium text-[var(--text)]",
            )}
          >
            Rekening
          </span>
        </div>
      </div>
    </div>
  );
}
