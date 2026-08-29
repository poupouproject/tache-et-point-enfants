import { redirect } from "next/navigation";

import { PinPad } from "@/components/pin-pad";
import { getSettings, isUnlocked } from "@/lib/auth/session";

import { submitAccessPin } from "./actions";

export default async function LoginPage() {
  if (await isUnlocked()) redirect("/");

  // Première installation: aucun NIP n'existe encore.
  if (!(await getSettings())) redirect("/bienvenue");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <PinPad
        action={submitAccessPin}
        title="Quêtes & Pièces"
        subtitle="Entre le NIP de la famille pour commencer"
        submitLabel="Entrer"
      />
    </main>
  );
}
