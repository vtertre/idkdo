import type {
  CreateParticipantRequestBody,
  CreateParticipantResponse,
  CreateParticipantRouteParams,
  CreateEventRequestBody,
  CreateEventResponse,
  GetEventEntryPageRouteParams,
} from "@idkdo/shared";
import type { CommandBus, QueryBus } from "@idkdo/patterns";
import { Uuid } from "@idkdo/patterns";
import type { FastifyReply, FastifyRequest } from "fastify";

import { CreateEventCommand } from "../../../commands/events/create-event-command.js";
import { CreateParticipantCommand } from "../../../commands/participants/create-participant-command.js";
import type { Participant } from "../../../domain/entities/participant.js";
import { GetEventEntryPageQuery } from "../../../queries/events/get-event-entry-page-query.js";

export class EventResource {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createEvent(
    request: FastifyRequest<{ Body: CreateEventRequestBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const body: CreateEventRequestBody = request.body;
    const eventId = await this.commandBus.execute(new CreateEventCommand(body.name));

    const response: CreateEventResponse = { id: eventId.toString() };

    reply.status(201).send(response);
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

  async createParticipant(
    request: FastifyRequest<{
      Body: CreateParticipantRequestBody;
      Params: CreateParticipantRouteParams;
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const participant = await this.commandBus.execute(
      new CreateParticipantCommand(
        Uuid.parse(request.params.eventId),
        request.body.name,
      ),
    );
    const response: CreateParticipantResponse = participantToResponse(participant);

    reply.status(201).send(response);
  }
}

function participantToResponse(participant: Participant): CreateParticipantResponse {
  return {
    createdAt: instantToIsoString(participant.createdAt),
    eventId: participant.eventId.toString(),
    id: participant.id.toString(),
    name: participant.name.value,
    updatedAt: instantToIsoString(participant.updatedAt),
  };
}

function instantToIsoString(instant: Participant["createdAt"]): string {
  return new Date(instant.epochMilliseconds).toISOString();
}
