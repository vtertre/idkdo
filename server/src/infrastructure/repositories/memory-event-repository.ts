import type { Uuid } from "@idkdo/patterns";

import type { Event } from "../../domain/entities/event.js";
import type { EventRepository } from "../../domain/repositories/event-repository.js";
import { MemoryRepository } from "./memory-repository.js";

export class MemoryEventRepository
  extends MemoryRepository<Uuid, Event>
  implements EventRepository {}
