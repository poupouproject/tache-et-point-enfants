import { redirect } from "next/navigation";

import { PinPad } from "@/components/pin-pad";
import { isParentMode, requireUnlocked } from "@/lib/auth/session";

import { submitParentPin } from "./actions";

export default async function ParentUnlockPage() {
  await requireUnlocked();
  if (await isParentMode()) redirect("/parent");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <PinPad
        action={submitParentPin}
        title="Espace parents"
        subtitle="Entre le NIP parent"
        submitLabel="Déverrouiller"
        accent="amber"
      />
    </main>
  );
}
