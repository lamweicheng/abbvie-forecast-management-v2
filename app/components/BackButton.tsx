"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  label = "Back",
  className = ""
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`inline-flex items-center rounded-sm border border-white px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 ${className}`}
      onClick={() => router.back()}
    >
      ← {label}
    </button>
  );
}
