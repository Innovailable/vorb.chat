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

  return <div className="start_wrapper">
    <div className="start_page">
      <h1>Welcome to UWP</h1>
      <p>UWP is ...</p>
      <ul>
        <li>a secure video chat platform</li>
        <li>using peer-to-peer connections and end-to-end encryption</li>
        <li>designed for around two to four participants (depending on bandwidth)</li>
        <li>a tech demo that is in active development</li>
      </ul>
      <p>If you want to integrate something like this in your project feel free to conact us at <a href="mailto:mail@innovailable.eu">mail@innovailable.eu</a>.</p>
      <div className="join">
        <TextField autoFocus outlined placeholder={defaultName} value={roomName} onChange={updateRoom} onKeyDown={onKeyDown} />
        <Button onClick={joinRoom} outlined><FeatherIcon icon={"play"} /></Button>
      </div>
    </div>
    <Footer />
  </div>
}
