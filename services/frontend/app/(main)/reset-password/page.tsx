import ResetPasswordPage from '@/components/pages/reset-password-page';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; 
}

export default async function ResetPasswordTokenPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const token = typeof query.token === 'string' ? query.token : null;
  if (!token) {
    redirect('/auth/login');
  }
  return <ResetPasswordPage token={token} email={null} />;
}
