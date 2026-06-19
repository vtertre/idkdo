import type { GetEventEntryPageRouteParams } from "@idkdo/shared";
import type { CommandBus, QueryBus } from "@idkdo/patterns";
import { Uuid } from "@idkdo/patterns";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { CreateEventCommand } from "../../../commands/events/create-event-command.js";
import { GetEventEntryPageQuery } from "../../../queries/events/get-event-entry-page-query.js";
import { parseRequestBody } from "../validation/parse-request-body.js";

const createEventRequestSchema = z
  .object({
    name: z.string().trim().min(1),
  })
  .strict();

export class EventResource {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createEvent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = parseRequestBody(createEventRequestSchema, request.body);
    const eventId = await this.commandBus.execute(new CreateEventCommand(body.name));

    reply.status(201).send({ id: eventId.toString() });
  }

  async getEventEntryPage(
    request: FastifyRequest<{ Params: GetEventEntryPageRouteParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const eventEntryPage = await this.queryBus.execute(
      new GetEventEntryPageQuery(Uuid.parse(request.params.eventId)),
    );

    if (!eventEntryPage) {
      reply.status(404).send({
        error: {
          code: "EVENT_NOT_FOUND",
          message: "Event not found.",
        },
      });

      return;
    }

    reply.send(eventEntryPage);
  }
}
