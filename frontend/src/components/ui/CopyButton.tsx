"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button, type ButtonProps } from "./Button";

interface CopyButtonProps {
  /** The text placed on the clipboard when pressed. */
  value: string;
  label?: string;
  copiedLabel?: string;
  /** Hide the text label and show only the icon. */
  iconOnly?: boolean;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/**
 * Copies a string to the clipboard and briefly confirms. Falls back silently if
 * the clipboard API is unavailable (the source text stays selectable).
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  iconOnly = false,
  className,
  variant = "subtle",
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the value remains visible to copy manually.
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onCopy}
      className={className}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? <Check /> : <Copy />}
      {iconOnly ? null : copied ? copiedLabel : label}
    </Button>
  );
}
