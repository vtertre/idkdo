import type { Command, CommandBus, QueryBus } from "@idkdo/patterns";
import { Uuid } from "@idkdo/patterns";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { CreateParticipantCommand } from "../../../commands/participants/create-participant-command.js";
import { Participant } from "../../../domain/entities/participant.js";
import { ParticipantName } from "../../../domain/value-objects/participant-name.js";
import { EventResource } from "./event-resource.js";

describe("EventResource", () => {
  it("creates a Participant and maps the domain result to the HTTP response", async () => {
    const eventId = Uuid.random();
    const participant = Participant.create({
      eventId,
      name: ParticipantName.create("Alice"),
    });
    const commandBus = new RecordingCommandBus(participant);
    const resource = new EventResource(commandBus, unusedQueryBus());
    const reply = new RecordingReply();

    await resource.createParticipant(
      {
        body: { name: "Alice" },
        params: { eventId: eventId.toString() },
      } as FastifyRequest<{
        Body: { name: string };
        Params: { eventId: string };
      }>,
      reply.asFastifyReply(),
    );

    const command = commandBus.command;

    expect(command).toBeInstanceOf(CreateParticipantCommand);
    expect((command as CreateParticipantCommand).eventId.equals(eventId)).toBe(true);
    expect((command as CreateParticipantCommand).name).toBe("Alice");
    expect(reply.statusCode).toBe(201);
    expect(reply.body).toEqual({
      createdAt: new Date(participant.createdAt.epochMilliseconds).toISOString(),
      eventId: eventId.toString(),
      id: participant.id.toString(),
      name: "Alice",
      updatedAt: new Date(participant.updatedAt.epochMilliseconds).toISOString(),
    });
  });
});

class RecordingCommandBus implements CommandBus {
  command: unknown;

  constructor(private readonly result: unknown) {}

  execute<TResult>(command: Command<TResult>): Promise<TResult> {
    this.command = command;

    return Promise.resolve(this.result as TResult);
  }
}

class RecordingReply {
  body: unknown;
  statusCode: number | undefined;

  asFastifyReply(): FastifyReply {
    return {
      send: (body: unknown) => {
        this.body = body;

        return this.asFastifyReply();
      },
      status: (statusCode: number) => {
        this.statusCode = statusCode;

        return this.asFastifyReply();
      },
    } as unknown as FastifyReply;
  }
}

function unusedQueryBus(): QueryBus {
  return {
    execute: vi.fn(),
  };
}
