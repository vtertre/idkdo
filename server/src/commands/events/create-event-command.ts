import type { Command, Uuid, commandResultType } from "@idkdo/patterns";

export class CreateEventCommand implements Command<Uuid> {
  declare readonly [commandResultType]: Uuid;

  constructor(readonly name: string) {}
}
