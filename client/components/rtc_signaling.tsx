import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { Calling, WebSocketChannel } from 'rtc-lib';

const DEFAULT_OPTIONS = {
  stun: "stun:innovailable.eu",
}

interface CallingContextState {
  calling?: Calling;
}

const CallingContext = createContext<CallingContextState>({});

export const useSignaling = () => useContext(CallingContext).calling;

export const useSignalingState = () => {
  const signaling = useSignaling();
  const [state, setState] = useState(signaling?.state);

  useEffect(() => {
    if(signaling == null) {
      return;
    }

    setState(signaling.state);
    signaling.on("state_changed", setState);

    return () => {
      signaling.removeListener("state_changed", setState);
    };
  }, [signaling]);

  return state;
}

interface RTCSignalingProps {
  address: string;
  options?: Record<string,any>
}

export const RTCSignaling: React.SFC<RTCSignalingProps> = ({ address, options, children }) => {
  const [calling, setCalling] = useState<Calling>();
  useEffect(() => {
    const channel = new WebSocketChannel(address);
    const calling = new Calling(channel, options || DEFAULT_OPTIONS);

    setCalling(calling);

    calling.connect();

    return () => {
      calling.close();
    }
  }, [address]);

  const context = { calling };

  return <CallingContext.Provider value={context}>
    {children}
  </CallingContext.Provider>;
}
