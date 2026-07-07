import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/session";
import { countBankAccounts } from "@/actions/onboarding";
import { StepIndicator } from "./_components/step-indicator";
import { BusinessForm } from "@/components/onboarding/business-form";

// Step 1 — create business. If the user already has a membership, they are past
// this step: send them to bank-account (0 accounts) or the app (≥1 account).
export default async function OnboardingPage() {
  const membership = await getActiveMembership();
  if (membership) {
    const accounts = await countBankAccounts();
    redirect(accounts > 0 ? "/dashboard" : "/onboarding/bank-account");
  }

  return (
    <>
      <StepIndicator current={1} />
      <Card className="p-8 max-sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          Buat bisnis kamu
        </h1>
        <p className="mb-6 mt-1 text-sm text-[var(--text-muted)]">
          Ini akan jadi ruang kerja untuk mencatat keuangan bisnismu.
        </p>
        <BusinessForm />
      </Card>
    </>
  );
}
