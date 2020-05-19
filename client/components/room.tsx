import * as React from 'react';
import { useState, useCallback } from 'react';

import { Link } from 'react-router-dom';

import { TextInput, TextArea, SimpleButton } from './form';

import { FeatherIcon } from './feather';

import { SimpleDialog } from '@rmwc/dialog';
import { Button } from '@rmwc/button';
import '@rmwc/dialog/styles';

import { RTCRoom, useRoom, useRoomState, useRoomPeers, useChatTextSend,  } from './rtc_room';
import { LocalPeerDisplay, RemotePeerDisplay } from './peer_view';
import { MessageList } from './message_list';
import { RoomEntrance } from './room_entrance';
import { Footer } from './footer';

const SelfContainer: React.SFC = () => {
  const room = useRoom();
  if(room == null) {
    // TODO
    return null;
  }
  return <div className="self_container">
    <LocalPeerDisplay peer={room.local} />
  </div>
}

const UserList: React.SFC = () => {
  const peers = useRoomPeers();

  const peer_views = Array.from(Object.entries(peers), ([id, peer]) => {
    return <React.Fragment key={id}>
      <RemotePeerDisplay peer={peer} />
    </React.Fragment>
  });

  return <>
    {peer_views}
  </>;
};

const ChatInput: React.SFC = () => {
  const [message, setMessage] = useState("");
  const send = useChatTextSend();

  const sendChat = useCallback(() => {
    send(message);
    setMessage("");
  }, [message, send, setMessage]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      send(message);
      setMessage("");
    }
  }, [message, send]);


  return <div className="chat_input">
    <TextInput value={message} update={setMessage} onKeyDown={onKeyDown} />
    <Button onClick={sendChat} outlined><FeatherIcon icon="send" /> </Button>
  </div>
}

const StateDialog: React.SFC<{ text: string }> = ({ text }) => {
  return <SimpleDialog body={text} open={true} preventOutsideDismiss />
}

const RoomStateDialogs: React.SFC = ({ children }) => {
  const state = useRoomState();

  if(state == null) {
    return null;
  }

  switch(state) {
    case "idle":
      return <RoomEntrance />

    case "connecting":
      return <StateDialog text="Connecting to room ..." />;

    case "connected":
      return null;

    case "failed":
      return <StateDialog text="Unable to connect" />;

    case "closed":
      return <StateDialog text="Connection lost" />;
  }
}

interface RoomProps {
  room_name: string;
}

export const Room: React.SFC<RoomProps> = (props) => {
  const { room_name } = props;
  return <RTCRoom name={room_name}>
    <RoomStateDialogs />
    <div className="container">
      <div className="header">
        <h2>{room_name}</h2>
        <Link to="/"><h2>UWP - Home</h2></Link>
      </div>
      <div className="content">
        <div className="stage">
          <UserList />
        </div>
        <div className="sidebar">
          <SelfContainer />
          <MessageList />
          <ChatInput />
        </div>
      </div>
      <Footer />
    </div>
  </RTCRoom>;
}
