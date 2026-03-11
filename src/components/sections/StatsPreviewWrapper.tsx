"use client";

import { type ReactNode } from "react";
import { FadeUp, StaggerContainer, StaggerItem, GlowCard } from "@/components/ui/Animate";

export function StatsPreviewAnimated({ children }: { children: ReactNode }) {
  return <FadeUp>{children}</FadeUp>;
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return (
    <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.12}>
      {children}
    </StaggerContainer>
  );
}

export function StatsCard({ children }: { children: ReactNode }) {
  return (
    <StaggerItem>
      <GlowCard className="bg-gradient-to-b from-navy to-surface border border-border rounded-xl overflow-hidden h-full">
        {children}
      </GlowCard>
    </StaggerItem>
  );
}
