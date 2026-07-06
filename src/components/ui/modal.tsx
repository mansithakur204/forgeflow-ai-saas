"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Modal System
// Built on top of the Dialog primitive (base-ui) with semantic variants,
// multiple sizes, and pre-composed confirm/form/alert modal patterns.
// ─────────────────────────────────────────────────────────────────────────────

// ── Size variants ─────────────────────────────────────────────────────────────

const modalContentVariants = cva(
  // Base — overrides DialogContent inner classes
  "w-full",
  {
    variants: {
      size: {
        xs: "sm:max-w-xs",
        sm: "sm:max-w-sm",
        md: "sm:max-w-md",
        lg: "sm:max-w-lg",
        xl: "sm:max-w-xl",
        "2xl": "sm:max-w-2xl",
        full: "sm:max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

// ── Modal Root (re-export Dialog) ─────────────────────────────────────────────
const Modal = Dialog;
const ModalTrigger = DialogTrigger;
const ModalClose = DialogClose;

// ── ModalContent ─────────────────────────────────────────────────────────────

export interface ModalContentProps
  extends React.ComponentProps<typeof DialogContent>,
    VariantProps<typeof modalContentVariants> {
  /** Scroll the body instead of the modal itself */
  scrollable?: boolean;
}

function ModalContent({
  size,
  scrollable = false,
  className,
  children,
  ...props
}: ModalContentProps) {
  return (
    <DialogContent
      className={cn(
        modalContentVariants({ size }),
        scrollable && "overflow-y-auto max-h-[85vh]",
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

// ── Semantic sections ─────────────────────────────────────────────────────────
const ModalHeader = DialogHeader;
const ModalTitle = DialogTitle;
const ModalDescription = DialogDescription;
const ModalFooter = DialogFooter;

// ─────────────────────────────────────────────────────────────────────────────
// Pre-composed: Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling for the confirm button */
  dangerous?: boolean;
  /** Async confirm — shows spinner */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  dangerous = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm" showCloseButton={false}>
        <ModalHeader>
          {dangerous && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 mb-1">
              <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
            </div>
          )}
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </ModalHeader>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            id="confirm-modal-cancel"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={dangerous ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
            id="confirm-modal-confirm"
            className="min-w-[90px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" variant="white" label="" />
                {confirmLabel}…
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-composed: Info / Alert Modal
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel?: string;
  icon?: React.ReactNode;
}

function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  closeLabel = "Got it",
  icon,
}: AlertModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm">
        <ModalHeader>
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-500/10 mb-1">
              <span className="text-brand-500 [&>svg]:w-5 [&>svg]:h-5" aria-hidden="true">
                {icon}
              </span>
            </div>
          )}
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </ModalHeader>
        <ModalFooter showCloseButton={false}>
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            id="alert-modal-close"
            className="w-full sm:w-auto"
          >
            {closeLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-composed: Form Modal (scrollable, with submit/cancel)
// ─────────────────────────────────────────────────────────────────────────────

export interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  size?: VariantProps<typeof modalContentVariants>["size"];
  loading?: boolean;
  onSubmit: () => void | Promise<void>;
  children: React.ReactNode;
}

function FormModal({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  size = "md",
  loading = false,
  onSubmit,
  children,
}: FormModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size={size} scrollable>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {children}

          <ModalFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              id="form-modal-cancel"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              id="form-modal-submit"
              className="min-w-[80px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" variant="white" label="" />
                  Saving…
                </span>
              ) : (
                submitLabel
              )}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ConfirmModal,
  AlertModal,
  FormModal,
  modalContentVariants,
};
