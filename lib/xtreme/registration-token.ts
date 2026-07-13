import { createHash, randomBytes } from "crypto";

export function createRegistrationToken() {
  return randomBytes(32).toString("hex");
}

export function hashRegistrationToken(token: string) {
  return createHash("sha256").update("registro|" + token).digest("hex");
}
