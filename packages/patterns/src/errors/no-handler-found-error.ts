export type MessageClass = {
  readonly name: string;
};

export class NoHandlerFoundError extends Error {
  readonly messageName: string;

  constructor(readonly messageClass: MessageClass) {
    const messageName = messageClass.name;

    super(`No handler found for ${messageName}`);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
    this.messageName = messageName;
  }
}
