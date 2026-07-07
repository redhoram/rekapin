"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertStrip } from "@/components/ui/alert-strip";
import { FieldError } from "@/components/ui/field-error";
import { BUSINESS_TYPES, BUSINESS_TYPE_VALUES } from "@/lib/constants";
import { createBusiness } from "@/actions/onboarding";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama bisnis tidak boleh kosong.")
    .max(120, "Nama bisnis terlalu panjang."),
  businessType: z.enum(BUSINESS_TYPE_VALUES, {
    errorMap: () => ({ message: "Pilih jenis usaha." }),
  }),
});

type FormValues = z.infer<typeof schema>;

export function BusinessForm() {
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const result = await createBusiness(values);
    // Success path redirects server-side; only a failure result returns here.
    if (result && !result.ok) {
      setFormError(result.error);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {formError && <AlertStrip>{formError}</AlertStrip>}

      <div>
        <Label htmlFor="name">Nama bisnis</Label>
        <Input
          id="name"
          placeholder="Contoh: Warung Kopi Senja"
          invalid={!!errors.name}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={isSubmitting}
          {...register("name")}
        />
        <FieldError id="name-error">{errors.name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="businessType">Jenis usaha</Label>
        <Controller
          control={control}
          name="businessType"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="businessType"
                invalid={!!errors.businessType}
                aria-invalid={!!errors.businessType}
                aria-describedby={
                  errors.businessType ? "businessType-error" : undefined
                }
              >
                <SelectValue placeholder="Pilih jenis usaha" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError id="businessType-error">
          {errors.businessType?.message}
        </FieldError>
      </div>

      <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan…" : "Lanjut"}
        {!isSubmitting && <ArrowRight size={18} strokeWidth={1.75} />}
      </Button>
    </form>
  );
}
