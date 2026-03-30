"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationForm } from "@/components/organizations/organization-form";
import type { OrganizationResponse } from "@/types/organization";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Após criar; o modal já é fechado antes deste callback. */
  onCreated?: (organization: OrganizationResponse) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrganizationDialogProps) {
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (open) {
      setFormKey((k) => k + 1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova organização</DialogTitle>
          <DialogDescription>
            Crie uma organização para gerenciar competições, times e eventos.
          </DialogDescription>
        </DialogHeader>
        <OrganizationForm
          key={formKey}
          onSuccess={(organization) => {
            onOpenChange(false);
            onCreated?.(organization);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
