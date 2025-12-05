"use client";

import React, { useEffect, useRef } from "react";

export default function Composer({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current && !disabled) {
      ref.current.removeAttribute("disabled");
    }
  }, [disabled]);

  useEffect(() => {
    // autofocus when mounted if not disabled
    if (ref.current && !disabled) ref.current.focus();
  }, [ref, disabled]);

  return (
    <textarea
      ref={ref}
      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
