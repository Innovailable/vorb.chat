import * as React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { useRoomConnect, useInputDevices, useInputControl, useInputStream, useInputConfiguration, useResolution, useTrackDeviceId, useTrackEnabled } from './rtc_room';
import { TextInput } from './form';

import { createName } from '../names';

import { fill_audio_context_pool } from '../audio_context_pool';

import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import { InputSelection } from './input_selection';
import { useHistory } from 'react-router-dom';

export const RoomEntrance: React.SFC = () => {
  const [name, setName] = useState(localStorage.getItem("name") || createName());
  const connect = useRoomConnect();
  const history = useHistory();

  const join = useCallback(() => {
    fill_audio_context_pool();

    localStorage.setItem("name", name);

    connect(name);
  }, [name, connect]);

  const cancel = useCallback(() => {
    history.push('/');
  }, [history]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      join();
    }
  }, [join]);

  return <Dialog open={true} preventOutsideDismiss>
    <DialogTitle>Select Devices</DialogTitle>
    <DialogContent>
      <TextInput label="Name" value={name} update={setName} onKeyDown={onKeyDown} />
      <br/>
      <InputSelection />
    </DialogContent>
    <DialogActions>
      <DialogButton onClick={cancel} action="close">Leave</DialogButton>
      <DialogButton onClick={join} action="accept" isDefaultAction>Join</DialogButton>
    </DialogActions>
  </Dialog>;
}
