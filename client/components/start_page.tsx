import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';

import {useHistory } from 'react-router-dom';
import { FeatherIcon } from './feather';

import * as Readable from 'readable-url-names';

import { Button } from '@rmwc/button';
import { TextField } from '@rmwc/textfield';
import { Footer } from './footer';

export const StartPage: React.SFC = () => {
  const [roomName, setRoomName] = useState("");
  const history = useHistory();

  const defaultName = useMemo(() => {
    const readable = new Readable(true, 5);
    return readable.generate();
  }, []);

  const updateRoom = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomName(e.target.value);
  }, [setRoomName]);

  const joinRoom = useCallback(() => {
    const room = roomName || defaultName;
    history.push(`/c/${room}`)
  },[roomName]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      joinRoom();
    }
  }, [joinRoom]);

  return <div className="start_page">
    <h1>Welcome to UWP - the universal WebRTC Project</h1>
    <div className="join">
      <TextField outlined placeholder={roomName} onChange={updateRoom} onKeyDown={onKeyDown} />
      <Button onClick={joinRoom} outlined><FeatherIcon icon={"play"} /></Button>
    </div>
  </div>
}
