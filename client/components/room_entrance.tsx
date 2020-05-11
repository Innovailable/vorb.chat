import * as React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { Stream } from 'rtc-lib';
import { useRoomConnect, useInputDevices, useInputControl, useInputStream, useInputConfiguration, useResolution, useTrackDeviceId, useTrackEnabled } from './rtc_room';
import { StreamVideo } from './peer_view';
import { TextInput, SimpleButton } from './form';

import { createName } from '../names';

import { fill_audio_context_pool } from '../audio_context_pool';

import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import { Switch, SwitchProps } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Select, SelectProps } from '@rmwc/select';
import '@rmwc/select/styles';
import { resolutions, sanitizeInputConfiguration, ResolutionKey, TrackKind } from '../input_control';

const DEVICE_NAMES = {
  audio: 'Microphone',
  video: 'Camera',
};

interface ResolutionSelectProps extends SelectProps {
}

const ResolutionSelect: React.SFC<ResolutionSelectProps> = (other) => {
  const control = useInputControl();
  const resolution = useResolution();

  const changeCb = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if(control == null) {
      return;
    }

    control.setResolution(e.target.value as ResolutionKey);
  }, [control]);

  const options = Object.entries(resolutions).map(([id, res]) => {
    const [width, height] = res.dimensions;
    return <option key={id} value={id}>{res.name} ({width}x{height})</option>
  });

  return <Select label="Preferred Resolution" value={resolution} onChange={changeCb} {...other}>
    {options}
  </Select>
};

interface DeviceSelectProps extends SelectProps {
  kind: TrackKind;
}

const DeviceSelect: React.SFC<DeviceSelectProps> = ({ kind, disabled, ...other }) => {
  const control = useInputControl();
  const deviceId = useTrackDeviceId(kind);
  const devices = useInputDevices(kind);

  const deviceName = DEVICE_NAMES[kind];

  const onChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if(control == null) {
      return;
    }

    control.setDeviceId(kind, e.target.value);
  }, [control]);

  let options: React.ReactNode;

  if(devices != null) {
    options = devices.map(({ deviceId, label }, index) => {
      if(!label) {
        label = deviceId == "default" ? "Default" : `${deviceName} ${index}`;
      }

      return <option key={deviceId} value={deviceId}>{label}</option>
    });
  } else {
    disabled = true;
  }

  let placeholder: string | undefined;

  if(devices == null || devices.length == 0) {
    placeholder = `No ${deviceName.toLowerCase()} found`;
  }

  return <Select label={deviceName} placeholder={placeholder} {...other} disabled={disabled} value={deviceId} onChange={onChange}>
    {options}
  </Select>
}

interface DeviceEnabledSwitchProps extends SwitchProps {
  kind: TrackKind;
}

const DeviceEnabledSwitch: React.SFC<DeviceEnabledSwitchProps> = ({ kind, ...other }) => {
  const control = useInputControl();
  const enabled = useTrackEnabled(kind);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if(control == null) {
      return;
    }

    control.setDeviceEnabled(kind, e.target.checked);
  }, [control]);

  return <Switch checked={enabled} onChange={onChange} {...other} />
}

interface StreamSelectionProps {
}

const StreamSelection: React.SFC<StreamSelectionProps> = ({ }) => {
  const audioEnabled = useTrackEnabled('audio');
  const videoEnabled = useTrackEnabled('video');

  // actual render

  return <>
    <div>
      <DeviceEnabledSwitch kind="audio" label="Audio" />
      <DeviceSelect disabled={!audioEnabled} kind="audio" />
    </div>
    <br/>
    <div>
      <DeviceEnabledSwitch kind="video" label="Video" />
      <DeviceSelect disabled={!videoEnabled} kind="video" />
      <ResolutionSelect disabled={!videoEnabled} />
    </div>
  </>;
}

export const RoomEntrance: React.SFC = () => {
  const [name, setName] = useState(localStorage.getItem("name") || createName());
  const stream = useInputStream();
  const connect = useRoomConnect();

  const click = useCallback(() => {
    console.log("connecting by click");
    fill_audio_context_pool();

    localStorage.setItem("name", name);

    connect(name);
  }, [name, connect]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      click();
    }
  }, [click]);

  return <Dialog open={true} preventOutsideDismiss>
    <DialogTitle>Select Devices</DialogTitle>
    <DialogContent>
      <TextInput label="Name" value={name} update={setName} onKeyDown={onKeyDown} />
      <br/>
      <div className="video_preview">
	<StreamVideo stream={stream} muted />
      </div>
      <br/>
      <br/>
      <StreamSelection />
    </DialogContent>
    <DialogActions>
      <DialogButton onClick={click} action="accept" isDefaultAction>Join</DialogButton>
    </DialogActions>
  </Dialog>;
}
