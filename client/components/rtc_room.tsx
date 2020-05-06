import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { CallingRoom, Stream, Peer, RemotePeer } from 'rtc-lib';
import { Chat, Message } from '../chat';
import { InputControl } from '../input_control';

import { useSignaling } from './rtc_signaling';
import { DeviceMapData } from '../device_map';
import { usePromiseResult } from './helper';

interface RoomContextState {
  input?: InputControl;
  room?: CallingRoom;
  chat?: Chat;
}

const RoomContext = createContext<RoomContextState>({});

export const useRoom = () => useContext(RoomContext).room;
export const useChat = () => useContext(RoomContext).chat;
export const useInputControl = () => useContext(RoomContext).input;

export const useRoomConnect = () => {
  const room = useRoom();
  const stream = useInputStreamPromise();

  return useCallback((name: string) => {
    if(room == null) {
      console.log("Unable to join room without room");
      return;
    }

    const local = room.local;
    local.status("name", name);

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
    const input = new InputControl();
    setContext({ room, chat, input });

    room.on('peer_joined', (peer: RemotePeer) => {
      const stream = input.getStream();

      // TODO make sure this never happens
      if(stream) {
        peer.addStream(stream);
      }

      peer.addStream('screenshare', new Stream(new MediaStream()), (createTransceiver) => {
        const transceiver = createTransceiver('video', { direction: 'recvonly' });

        const update = async (screenshare: Promise<Stream> | undefined) => {
          try {
            if(screenshare != null) {
              const stream = await screenshare;
              transceiver.sender.replaceTrack(stream.getTracks('video')[0]);
              transceiver.direction = 'sendrecv';
            } else {
              transceiver.sender.replaceTrack(null);
              transceiver.direction = 'recvonly';
            }
          } catch(err) {
            transceiver.sender.replaceTrack(null);
            transceiver.direction = 'recvonly';
          }

          peer.negotiate();
        };

        update(input.getScreenshare());
        input.on('screenshareChanged', update);

        peer.once('left', () => {
          input.off('screenshareChanged', update);
        });
      });

      peer.connect();
    });

    return () => {
      room.leave()
      input.close();
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

    chat.on("messagesChanged", messageCb);

    return () => {
      chat.off("messagesChanged", messageCb);
    }
  }, [chat, setMessages]);

  return messages;
}

export const useChatTextSend = () => {
  const chat = useChat();

  return useCallback((text: string) => {
    if(chat == null) {
      console.log("Chat not ready to send");
      return;
    }

    chat.sendText(text);
  }, [chat]);
}

export const useInputDevices = () => {
  const [devices, setDevices] = useState<DeviceMapData>();
  const input = useInputControl();

  useEffect(() => {
    if(input == null) {
      setDevices(undefined);
      return;
    }

    setDevices(input.getDevices());
    input.on('devicesChanged', setDevices);

    return () => {
      input.off('devicesChanged', setDevices);
    };
  }, [input]);

  return devices;
}


export const useInputStreamPromise = () => {
  const [stream, setStream] = useState<Promise<Stream> | undefined>();
  const input = useInputControl();

  useEffect(() => {
    if(input == null) {
      setStream(undefined);
      return;
    }

    setStream(input.getStream());
    input.on('streamChanged', setStream);

    return () => {
      input.off('streamChanged', setStream);
    };
  }, [input]);

  return stream;
};

export const useInputStream = () => {
  const streamPromise = useInputStreamPromise();
  return usePromiseResult(streamPromise);
};

