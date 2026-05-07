import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next || "/professional";
  const notice = params.notice || "";

  return <LoginForm nextPath={nextPath} notice={notice} />;
}
