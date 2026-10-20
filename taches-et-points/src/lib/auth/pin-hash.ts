import bcrypt from "bcryptjs";

// bcryptjs est du JavaScript pur: sa variante synchrone monopolise la boucle
// d'événements pendant tout le calcul, ce qui fige le serveur à chaque essai.
export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
