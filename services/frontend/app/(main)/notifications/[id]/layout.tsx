import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notificação",
  robots: { index: false, follow: false },
};

export default function NotificationDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
