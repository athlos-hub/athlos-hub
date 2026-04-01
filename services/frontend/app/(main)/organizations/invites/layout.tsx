import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convites de organização",
  description: "Gerencie convites para organizações esportivas no AthlosHub.",
  robots: { index: false, follow: false },
};

export default function OrgInvitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
