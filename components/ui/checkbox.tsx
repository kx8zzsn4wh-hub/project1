"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-zinc-400 bg-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 data-[state=indeterminate]:border-zinc-900 data-[state=indeterminate]:bg-zinc-900",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
      V
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
