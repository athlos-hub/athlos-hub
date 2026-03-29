"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  MessageCircle,
  Radio,
  Sparkles,
} from "lucide-react";

import { MOCK_HOME_HIGHLIGHTS, type HomeHighlight } from "@/lib/mocks/home";

const ICONS: Record<string, LucideIcon> = {
  live: Radio,
  manage: CalendarRange,
  social: MessageCircle,
  early: Sparkles,
};

function HighlightCell({ item }: { item: HomeHighlight }) {
  const Icon = ICONS[item.id] ?? Sparkles;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-6 text-center sm:px-6">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-main/10 text-main">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-foreground">{item.title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {item.description}
      </p>
    </div>
  );
}

export function StatsBar() {
  return (
    <section
      id="home-highlights"
      aria-labelledby="home-highlights-heading"
      className="border-b border-border bg-card"
    >
      <h2 id="home-highlights-heading" className="sr-only">
        Destaques da plataforma
      </h2>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-0 lg:grid-cols-4">
          {MOCK_HOME_HIGHLIGHTS.map((item, index) => (
            <div
              key={item.id}
              className="relative flex items-stretch justify-center"
            >
              {index > 0 ? (
                <div
                  className="absolute left-0 top-1/4 hidden h-1/2 w-px bg-border lg:block"
                  aria-hidden
                />
              ) : null}
              {index % 2 === 1 ? (
                <div
                  className="absolute left-0 top-1/4 h-1/2 w-px bg-border lg:hidden"
                  aria-hidden
                />
              ) : null}
              <HighlightCell item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
