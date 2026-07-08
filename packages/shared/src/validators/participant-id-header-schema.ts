import { z } from "zod";

export const participantIdHeaderName = "x-participant-id";

export const participantIdHeaderSchema = z.looseObject({
  [participantIdHeaderName]: z.string().uuid(),
});

export type ParticipantIdHeader = z.infer<typeof participantIdHeaderSchema>;
