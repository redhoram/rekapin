"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { AlertStrip } from "@/components/ui/alert-strip";
import { Segmented } from "@/components/ui/segmented";
import { inviteMember } from "@/actions/members";
import type { Role } from "@/lib/constants";

/** Simple email shape check, mirrored server-side by the zod schema. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_NOTE: Record<Role, string> = {
  staff: "Bisa input & rapikan data, tanpa akses ke laporan.",
  admin: "Akses penuh: laporan, dashboard, dan pengaturan.",
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("staff");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("staff");
    setEmailError(null);
    setFormError(null);
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async () => {
    setEmailError(null);
    setFormError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Masukkan email yang valid.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteMember({ email, role });
      if (res.ok) {
        onOpenChange(false);
        onDone("Undangan terkirim.");
      } else {
        setFormError(res.error);
      }
    } catch {
      setFormError("Gagal mengirim undangan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle>Undang anggota</DialogTitle>

        <div className="mt-4 flex flex-col gap-4">
          {formError && <AlertStrip>{formError}</AlertStrip>}

          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bisnis.com"
              disabled={submitting}
              invalid={!!emailError}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "invite-email-error" : undefined}
            />
            <FieldError id="invite-email-error">{emailError}</FieldError>
          </div>

          <div>
            <Label>Peran</Label>
            <Segmented
              ariaLabel="Peran anggota"
              value={role}
              onChange={setRole}
              disabled={submitting}
              options={[
                { value: "staff", label: "Staff" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              {ROLE_NOTE[role]}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                Mengirim…
              </>
            ) : (
              "Kirim undangan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
