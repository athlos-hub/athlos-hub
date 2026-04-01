import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notificações",
  description: "Central de notificações do AthlosHub.",
  robots: { index: false, follow: false },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
