import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#081018] text-brand-grey">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
