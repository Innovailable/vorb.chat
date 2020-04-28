import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';

import { Stream } from 'rtc-lib';
import { useRoomConnect } from './rtc_room';
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

const { mediaDevices } = navigator;

interface ResolutionInfo {
  name: string;
  dimensions: [number,number],
}

const resolutions = new Map<string,ResolutionInfo>([
  ["qvga", {
    name: "QVGA",
    dimensions: [320, 240],
  }],
  ["vga", {
    name: "VGA",
    dimensions: [640, 480],
  }],
  ["720p", {
    name: "HD",
    dimensions: [1280, 720],
  }],
  ["1080p", {
    name: "Full HD",
    dimensions: [1920, 1080],
  }],
  ["4k", {
    name: "UHD 4k",
    dimensions: [3180, 2160],
  }],
])

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

function filterDevices(devices: MediaDeviceInfo[], kind: MediaDeviceKind) {
  const ids = new Set<string>();

  return devices.filter((device) => {
    if(ids.has(device.deviceId)) {
      return false;
    }

    ids.add(device.deviceId);
    return device.kind === kind
  });
}

async function updateDevices(setDevices: (devices: DeviceMap) => void) {
  const devices = await mediaDevices.enumerateDevices()

  setDevices({
    audio: filterDevices(devices, "audioinput"),
    video: filterDevices(devices, "videoinput"),
  });
};

function sanitizeDeviceId(id: string | undefined, key: string, devices?: MediaDeviceInfo[]): string | undefined {
  if(devices == null) {
    return id;
  }

  const validId = (checkId: string) => {
    return devices.some((info) => info.deviceId === checkId);
  }

  if(id != null && validId(id)) {
    return id;
  }

  const stored = localStorage.getItem(key);

  if(stored != null && validId(stored)) {
    return stored;
  }

  if(devices != null && devices.length > 0) {
    return devices[0].deviceId;
  }

  return undefined;
}

function getSourceConstraint<T>(enabled: boolean, deviceId?: string, other?: T) {
  if(!enabled) {
    return false;
  } else if(deviceId == null) {
    return {};
  } else {
    return { deviceId, ...other }
  }
}

interface StreamSelectionProps {
  value?: Promise<Stream>;
  update: (data: Promise<Stream> | undefined) => void
}

const StreamSelection: React.SFC<StreamSelectionProps> = ({ value, update }) => {
  const [devices, setDevices] = useState<Partial<DeviceMap>>({});
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [audioId, setAudioId] = useState<string>();
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [videoId, setVideoId] = useState<string>();
  const [resolution, setResolution] = useState<string>();

  const cleanup = useRef<Promise<unknown>>(Promise.resolve());

  // TODO save enabled/disabled

  // restore from storage

  useEffect(() => {
    setAudioEnabled(localStorage.getItem("audioEnabled") != "false");
    setVideoEnabled(localStorage.getItem("videoEnabled") != "false");
    setResolution(localStorage.getItem("resolution") ?? "720p");
  }, []);

  // sanitize and restore ids

  useEffect(() => {
    setAudioId(sanitizeDeviceId(audioId, "audioInput", devices.audio));
    setVideoId(sanitizeDeviceId(videoId, "videoInput", devices.video));
  }, [devices]);

  // update device list

  useEffect(() => {
    const doUpdate = () => {
      updateDevices(setDevices);
    };

    mediaDevices.ondevicechange = doUpdate;
    doUpdate();

    return () => {
      mediaDevices.ondevicechange = null;
    };
  }, []);

  // get stream

  useEffect(() => {
    if(resolution == null) {
      return;
    }

    // create constraints

    const resInfo = resolutions.get(resolution);
    const resData = {
      width: { ideal: resInfo?.dimensions[0] },
      height: { ideal: resInfo?.dimensions[1] },
    }

    const constraints: MediaStreamConstraints = {
      audio: getSourceConstraint(audioEnabled, audioId),
      video: getSourceConstraint(videoEnabled, videoId, resData),
    };

    // wroth requesting?

    if(constraints.audio === false && constraints.video === false) {
      update(undefined);
      return;
    }

    // actually create stream

    const stream_p = cleanup.current.then(() => {
      return Stream.createStream(constraints);
    });

    update(stream_p);

    // workaround because device list gets more detailed after guM

    if(devices.audio != null && devices.audio[0]?.label === "") {
      stream_p.then(() => {
        updateDevices(setDevices);
      })
    }

    // cleanup

    return () => {
      cleanup.current = stream_p.then((stream) => stream.stop());
    }
  }, [audioId, audioEnabled, videoId, videoEnabled, resolution]);

  // actual render

  return <>
    <div>
      <Switch checked={audioEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAudioEnabled(e.target.checked)} label="Audio" />
      <DeviceSelect disabled={!audioEnabled} value={audioId} update={setAudioId} devices={devices.audio} storageKey="audioInput" deviceName="Microphone" />
    </div>
    <br/>
    <div>
      <Switch checked={videoEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVideoEnabled(e.target.checked)} label="Video" />
      <DeviceSelect disabled={!videoEnabled} value={videoId} update={setVideoId} devices={devices.video} storageKey="videoInput" deviceName="Camera" />
      <ResolutionSelect disabled={!videoEnabled} value={resolution} update={setResolution} />
    </div>
  </>;
}

export const RoomEntrance: React.SFC = () => {
  const [name, setName] = useState(localStorage.getItem("name") || createName());
  const [stream, setStream] = useState<Promise<Stream>>();
  const connect = useRoomConnect();

  const click = useCallback(() => {
    console.log("connecting by click");
    fill_audio_context_pool();

    localStorage.setItem("name", name);

    if(stream != null) {
      stream.then((s) => {
        connect(name, s.clone());
      });
    } else {
      connect(name, stream);
    }
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
      <StreamSelection value={stream} update={setStream} />
    </DialogContent>
    <DialogActions>
      <DialogButton onClick={click} action="accept" isDefaultAction>Join</DialogButton>
    </DialogActions>
  </Dialog>;
}
