import { Room, RemotePeer, DataChannel } from 'rtc-lib';
import { EventEmitter } from 'events';
import { encode, decode } from "@msgpack/msgpack";

const CHAT_CHANNEL = 'chat';

enum TelegramType {
  Ack,
  Text,
}

interface AckTelegram {
  type: TelegramType.Ack;
  tid: number;
}

interface TextTelegram {
  type: TelegramType.Text;
  tid: number;
  text: string;
}

type Telegram = AckTelegram | TextTelegram;

// message queue

enum SendState {
  Sending,
  Sent,
  Failed,
}

export interface IncomingMessage {
  readonly type: "incoming";
  readonly when: Date;
  readonly from: string;
  readonly text: string;
}

export interface OutgoingMessage {
  readonly type: "outgoing";
  readonly when: Date;
  readonly text: string;
  readonly states: Record<string,SendState>;
}

export interface StatusMessage {
  readonly type: "status";
  readonly when: Date;
  readonly who: string;
  readonly what: "enter" | "leave";
}

export type Message = IncomingMessage | OutgoingMessage | StatusMessage;

type OutstandingCb = () => void;

export class ChatPeer extends EventEmitter {
  channel_p: Promise<DataChannel>;
  name: string;
  readonly outstanding = new Map<number,OutstandingCb>();
  next_tid = 0;

  constructor(peer: RemotePeer) {
    super();

    this.channel_p = peer.channel(CHAT_CHANNEL);
    // TODO rename
    this.name = peer.status("name") ?? "[unnamed]";

    this.channel_p.then((channel) => {
      channel.on("message", (data: any) => {
        const msg = decode(data) as Telegram;

        switch(msg.type) {
          case TelegramType.Ack: {
            const { tid } = msg;
            const cb = this.outstanding.get(tid);

            if(cb != null) {
              cb();
              this.outstanding.delete(tid);
            } else {
              console.log("got invalid ack", tid);
            }

            break;
          }

          case TelegramType.Text: {
            const { tid, text } = msg;

            this.emit("text", text);
            this.sendAck(tid);

            break;
          }
        }
      });

      return channel.connect();
    });
  }

  sendText(text: string) {
    return this.request({
      type: TelegramType.Text,
      tid: this.next_tid++,
      text,
    });
  }

  private sendAck(tid: number) {
    return this.send({
      type: TelegramType.Ack,
      tid,
    });
  }

  private async request(data: Telegram) {
    const { tid } = data;

    const response = new Promise((resolve) => {
      this.outstanding.set(tid, resolve);
    });

    await this.send(data);
    return response;
  }

  private async send(data: Telegram) {
    const channel = await this.channel_p;
    return channel.send(encode(data));
  }
}

export class Chat extends EventEmitter {
  readonly peers = new Map<string,ChatPeer>();
  readonly old_names = new Map<string,string>();
  readonly messages = Array<Message>();

  constructor(room: Room) {
    super();

    room.local.addDataChannel(CHAT_CHANNEL, { ordered: true });

    room.on("peer_joined", this.addPeer.bind(this));
  }

  getPeerName(id: string): string {
    return this.peers.get(id)?.name ?? this.old_names.get(id) ?? id;
  }

  getNamedMessages(): Array<Message> {
    return this.messages.map((message): Message => {
      switch(message.type) {
        case "incoming": {
          const from = this.getPeerName(message.from);
          return { ...message, from };
        }

        case "outgoing": {
          return message;
        }

        case "status": {
          const who = this.getPeerName(message.who);
          return { ...message, who };
        }
      }
    });
  }

  sendText(text: string) {
    const message: OutgoingMessage = {
      type: "outgoing",
      when: new Date(),
      text: text,
      states: {},
    }

    for(const [id, peer] of this.peers.entries()) {
      message.states[id] = SendState.Sending;

      peer.sendText(text)
        .then(() => {
          message.states[id] = SendState.Sent;
          this.emit("messages_changed");
        })
        .catch((err) => {
          message.states[id] = SendState.Failed;
          this.emit("messages_changed");
        });
    }

    this.addMessage(message);
  }

  private addMessage(message: Message) {
    this.messages.push(message);
    this.emit("messages_changed");
  }

  private addPeer(remote_peer: RemotePeer, id: string) {
    const chat_peer = new ChatPeer(remote_peer);

    this.peers.set(id, chat_peer);

    chat_peer.on('text', (text) => {
      this.addMessage({
        type: "incoming",
        when: new Date(),
        from: id,
        text: text,
      });
    });

    remote_peer.once("left", () => {
      const name = remote_peer.status("name");
      this.old_names.set(id, name);

      this.peers.delete(id);

      this.addMessage({
        type: "status",
        when: new Date(),
        who: id,
        what: "leave",
      });
    });

    this.addMessage({
      type: "status",
      when: new Date(),
      who: id,
      what: "enter",
    });
  }
}
