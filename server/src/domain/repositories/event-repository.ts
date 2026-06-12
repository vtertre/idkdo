import type { Repository, Uuid } from "@idkdo/patterns";

import type { Event } from "../entities/event.js";

export type EventRepository = Repository<Uuid, Event>;
