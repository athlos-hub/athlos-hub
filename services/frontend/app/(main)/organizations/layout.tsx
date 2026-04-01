import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizações",
  description:
    "Descubra organizações esportivas no AthlosHub, acompanhe competições e entre em comunidades.",
};

export default function OrganizationsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
