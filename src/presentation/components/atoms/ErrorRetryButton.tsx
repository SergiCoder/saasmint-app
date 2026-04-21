"use client";

import { Button } from "./Button";

export interface ErrorRetryButtonProps {
  onReset: () => void;
  label: string;
}

export function ErrorRetryButton({ onReset, label }: ErrorRetryButtonProps) {
  return (
    <Button variant="primary" onClick={onReset}>
      {label}
    </Button>
  );
}
