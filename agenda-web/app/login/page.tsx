import { LoginForm } from "@/components/auth/login-form";
import { sanitizeInternalPath } from "@/lib/utils/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeInternalPath(params.next);
  const notice = params.notice || "";

  return <LoginForm nextPath={nextPath} notice={notice} />;
}
