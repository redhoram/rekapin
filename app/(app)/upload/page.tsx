import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { bankAccounts } from "@/lib/db/schema";
import { listUploads } from "@/actions/upload";
import { UploadClient, type AccountOption } from "./_components/upload-client";

// Upload flow — admin + staff. Server component resolves the role-scoped account
// list + recent history, then hands off to the client state machine.
export default async function UploadPage() {
  const { businessId, role } = await requireRole(["admin", "staff"]);

  const accountRows = await db
    .select({
      id: bankAccounts.id,
      bankCode: bankAccounts.bankCode,
      label: bankAccounts.label,
      accountMask: bankAccounts.accountMask,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.businessId, businessId));

  const accounts: AccountOption[] = accountRows;
  const initialHistory = await listUploads();

  return (
    <UploadClient
      accounts={accounts}
      initialHistory={initialHistory}
      isAdmin={role === "admin"}
    />
  );
}
