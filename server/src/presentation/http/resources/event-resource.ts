import type { CommandBus } from "@idkdo/patterns";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { CreateEventCommand } from "../../../commands/events/create-event-command.js";
import { parseRequestBody } from "../validation/parse-request-body.js";

const createEventRequestSchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export class EventResource {
  constructor(private readonly commandBus: CommandBus) {}

  async createEvent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = parseRequestBody(createEventRequestSchema, request.body);
    const eventId = await this.commandBus.execute(new CreateEventCommand(body.name));

    reply.status(201).send({ id: eventId.toString() });
  }
}
