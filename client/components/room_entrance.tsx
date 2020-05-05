import * as React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { Stream } from 'rtc-lib';
import { useRoomConnect, useInputDevices, useInputControl, useInputStream, useInputStreamPromise, usePromiseResult } from './rtc_room';
import { StreamVideo } from './peer_view';
import { TextInput, SimpleButton } from './form';

import { createName } from '../names';

import { fill_audio_context_pool } from '../audio_context_pool';

import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Select, SelectProps } from '@rmwc/select';
import '@rmwc/select/styles';
import { resolutions, sanitizeInputConfiguration } from '../input_control';

interface ResolutionSelectProps extends SelectProps {
  value?: string;
  update: (data: string) => void;
}

const ResolutionSelect: React.SFC<ResolutionSelectProps> = (props) => {
  const { update, ...other } = props;

  const changeCb = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem("resolution", e.target.value);
    update(e.target.value);
  }, [update]);

  const options = Array.from(resolutions.entries(), ([id, res]) => {
    const [width, height] = res.dimensions;
    return <option key={id} value={id}>{res.name} ({width}x{height})</option>
  });

  return <Select label="Preferred Resolution" onChange={changeCb} {...other}>
    {options}
  </Select>
};

interface DeviceMap {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
}

interface DeviceSelectProps extends SelectProps {
  value?: string;
  update: (data: string) => void;
  devices?: MediaDeviceInfo[];
  storageKey: string;
  deviceName: string;
}

const DeviceSelect: React.SFC<DeviceSelectProps> = (props) => {
  let { value, update, devices, storageKey, deviceName, disabled, ...other } = props;

  const onChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem(storageKey, e.target.value);
    update(e.target.value);
  }, [update]);

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

  return <Select label={deviceName} placeholder={placeholder} {...other} disabled={disabled} value={value} onChange={onChange}>
    {options}
  </Select>
}

interface StreamSelectionProps {
}

const StreamSelection: React.SFC<StreamSelectionProps> = ({ }) => {
  const inputControl = useInputControl();
  const devices = useInputDevices();
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [audioId, setAudioId] = useState<string>();
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [videoId, setVideoId] = useState<string>();
  const [resolution, setResolution] = useState<string>("720p");

  const cleanup = useRef<Promise<unknown>>(Promise.resolve());

  // TODO save enabled/disabled

  // restore from storage

  useEffect(() => {
    setAudioEnabled(localStorage.getItem("audioEnabled") != "false");
    setAudioId(localStorage.getItem('audioInput') ?? undefined);
    setVideoEnabled(localStorage.getItem("videoEnabled") != "false");
    setVideoId(localStorage.getItem('videoInput') ?? undefined);
    setResolution(localStorage.getItem("resolution") ?? resolution);
  }, []);

  const sanitizedConfig = useMemo(() => {
    return sanitizeInputConfiguration({
      audio: {
        deviceId: audioId,
        enabled: audioEnabled,
      },
      video: {
        deviceId: videoId,
        enabled: videoEnabled,
        resolution,
      },
    }, devices);
  }, [audioEnabled, audioId, videoEnabled, videoId, resolution, devices]);

  // get stream

  useEffect(() => {
    if(inputControl == null) {
      return;
    }

    inputControl.configureStream(sanitizedConfig);
  }, [inputControl, sanitizedConfig]);

  // actual render

  return <>
    <div>
      <Switch checked={audioEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAudioEnabled(e.target.checked)} label="Audio" />
      <DeviceSelect disabled={!audioEnabled} value={sanitizedConfig.audio.deviceId} update={setAudioId} devices={devices?.audio} storageKey="audioInput" deviceName="Microphone" />
    </div>
    <br/>
    <div>
      <Switch checked={videoEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVideoEnabled(e.target.checked)} label="Video" />
      <DeviceSelect disabled={!videoEnabled} value={sanitizedConfig.video.deviceId} update={setVideoId} devices={devices?.video} storageKey="videoInput" deviceName="Camera" />
      <ResolutionSelect disabled={!videoEnabled} value={resolution} update={setResolution} />
    </div>
  </>;
}

export const RoomEntrance: React.SFC = () => {
  const [name, setName] = useState(localStorage.getItem("name") || createName());
  const streamPromise = useInputStreamPromise();
  const stream = usePromiseResult(streamPromise);
  const connect = useRoomConnect();

  const click = useCallback(() => {
    console.log("connecting by click");
    fill_audio_context_pool();

    localStorage.setItem("name", name);

    connect(name);
  }, [name, stream]);

  return <Dialog open={true} onClose={() => null} preventOutsideDismiss>
    <DialogTitle>Select Devices</DialogTitle>
    <DialogContent>
      <TextInput label="Name" value={name} update={setName} />
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
