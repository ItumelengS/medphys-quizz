import type { PowerUpInventory, PowerUpType } from "./types";
import { MAX_POWERUP_STOCK } from "./types";

export function emptyInventory(): PowerUpInventory {
  return { fifty_fifty: 0, time_freeze: 0 };
}

export function parseInventory(raw: unknown): PowerUpInventory {
  const inv = emptyInventory();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.fifty_fifty === "number") inv.fifty_fifty = obj.fifty_fifty;
    if (typeof obj.time_freeze === "number") inv.time_freeze = obj.time_freeze;
  }
  return inv;
}

export function awardPowerUp(inventory: PowerUpInventory): { updated: PowerUpInventory; awarded: PowerUpType | null } {
  const types: PowerUpType[] = ["fifty_fifty", "time_freeze"];
  // Filter to types that aren't at max
  const available = types.filter((t) => inventory[t] < MAX_POWERUP_STOCK);
  if (available.length === 0) return { updated: inventory, awarded: null };

  const chosen = available[Math.floor(Math.random() * available.length)];
  const updated = { ...inventory, [chosen]: inventory[chosen] + 1 };
  return { updated, awarded: chosen };
}

export function usePowerUp(inventory: PowerUpInventory, type: PowerUpType): PowerUpInventory | null {
  if (inventory[type] <= 0) return null;
  return { ...inventory, [type]: inventory[type] - 1 };
}
