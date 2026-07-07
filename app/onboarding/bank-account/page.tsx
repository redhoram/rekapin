import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/session";
import { countBankAccounts } from "@/actions/onboarding";
import { StepIndicator } from "../_components/step-indicator";
import { BankAccountForm } from "@/components/onboarding/bank-account-form";

// Step 2 — add ≥1 bank account. Reachable only after a business exists. If the
// user has no business yet, back to step 1; if ≥1 account already exists,
// onboarding is complete → dashboard (not re-enterable).
export default async function BankAccountPage() {
  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const accounts = await countBankAccounts();
  if (accounts > 0) {
    redirect("/dashboard");
  }

  return (
    <>
      <StepIndicator current={2} />
      <Card className="p-8 max-sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          Tambah rekening bank
        </h1>
        <p className="mb-6 mt-1 text-sm text-[var(--text-muted)]">
          Tambahkan minimal satu rekening. Saldo awal jadi titik mulai
          pencatatanmu.
        </p>
        <BankAccountForm />
      </Card>
    </>
  );
}
