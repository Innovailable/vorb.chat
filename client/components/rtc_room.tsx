import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { CallingRoom, Stream, Peer, RemotePeer } from 'rtc-lib';
import { Chat, Message } from '../chat';

import { useSignaling } from './rtc_signaling';

interface RoomContextState {
  room?: CallingRoom;
  chat?: Chat;
}

const RoomContext = createContext<RoomContextState>({});

export const useRoom = () => useContext(RoomContext).room;
export const useChat = () => useContext(RoomContext).chat;

export const useRoomConnect = () => {
  const room = useRoom();

  return useCallback((name: string, stream?: Promise<Stream> | Stream) => {
    if(room == null) {
      console.log("Unable to join room without room");
      return;
    }

    const local = room.local;
    local.status("name", name);

    if(stream != null) {
      room.local.addStream(Peer.DEFAULT_STREAM, stream);
    }

    room.connect().catch((err) => {
      console.log(err);
    });
  }, [room]);
}

export const useRoomState = () => {
  const room = useRoom();
  const [state, setState] = useState(room?.state);

  useEffect(() => {
    if(room == null) {
      return;
    }

    setState(room.state);

    room.on("state_changed", setState);

    return () => {
      room.removeListener("state_changed", setState);
    };
  }, [room]);

  return state;
}

interface RTCRoomProps {
  name: string;
}

export const RTCRoom: React.SFC<RTCRoomProps> = ({ name, children }) => {
  const calling = useSignaling();
  const [context, setContext] = useState<RoomContextState>({});

  useEffect(() => {
    if(calling == null) {
      // TODO error handling
      return;
    }

    const room = calling.room(name);
    const chat = new Chat(room);
    setContext({ room, chat });

    return () => {
      room.local.stream()?.then((stream) => {
        stream.stop();
      });

      room.leave()
    };
  }, [calling, name]);

  return <RoomContext.Provider value={context}>
    {children}
  </RoomContext.Provider>;
}

export const useRoomPeers = () => {
  const [peers, setPeers] = useState<Record<string,RemotePeer>>({});

  const room = useRoom();

  useEffect(() => {
    if(room == null) {
      console.log("no room, no peers!");
      setPeers({});
      return;
    }

    setPeers({...room.peers});

    const peersChanged = (peers: Record<string,RemotePeer>) => {
      setPeers({...peers});
    };

    room.on('peers_changed', peersChanged);

    return () => {
      room.removeListener("peers_changed", peersChanged);
    };
  }, [room]);

  return peers;
}

export const useChatMessages = () => {
  const chat = useChat();
  const [messages, setMessages] = useState<Array<Message>>([]);

  useEffect(() => {
    if(chat == null) {
      setMessages([]);
      return;
    }

    setMessages(chat.getNamedMessages());

    const messageCb = () => {
      setMessages(chat.getNamedMessages());
    };

    chat.on("messages_changed", messageCb);

    return () => {
      chat.removeListener("messages_changed", messageCb);
    }
  }, [chat, setMessages]);

  return messages;
}

export const useChatTextSend = () => {
  const chat = useChat();
  console.log(chat);

  return useCallback((text: string) => {
    if(chat == null) {
      console.log("Chat not ready to send");
      return;
    }

    chat.sendText(text);
  }, [chat]);
}
