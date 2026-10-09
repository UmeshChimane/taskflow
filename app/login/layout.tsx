import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Reads the session cookie on every request, so this route must never be
// prerendered/cached as static HTML.
export const dynamic = "force-dynamic";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}