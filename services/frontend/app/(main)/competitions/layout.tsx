import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Competições",
  description:
    "Explore e acompanhe competições esportivas: modalidades, organizações, fases e inscrições no AthlosHub.",
};

export default function CompetitionsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
