import { redirect } from "next/navigation";

import { getSettings } from "@/lib/auth/session";

import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  // Une fois configurée, cette page n'a plus de raison d'exister.
  if (await getSettings()) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <SetupForm />
    </main>
  );
}
