/** Who performed an inventory change — a nurse or the automated system. */
export type LogActor =
  | { type: "nurse"; userId: string; name: string }
  | { type: "system"; label: string };

export const SYSTEM_LOG_ACTOR: LogActor = {
  type: "system",
  label: "Transfer by system",
};
