"use client";

import Image from "next/image";
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

export function StatsCard({ children, bgImage }: { children: ReactNode; bgImage?: string }) {
  return (
    <StaggerItem>
      <GlowCard className="relative bg-navy border border-border rounded-xl overflow-hidden">
        {bgImage && (
          <>
            <Image
              src={bgImage}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-[#1a2744]/85" />
          </>
        )}
        <div className="relative z-10">{children}</div>
      </GlowCard>
    </StaggerItem>
  );
}
