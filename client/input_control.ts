import * as Emittery from 'emittery';
import * as equal from 'fast-deep-equal';
import { DeviceMapData, DeviceMapHandler } from './device_map';
import { Stream } from 'rtc-lib';

export interface TrackConfiguration {
  enabled: boolean;
  deviceId?: string;
}

export interface VideoTrackConfiguration extends TrackConfiguration {
  resolution: string;
}

export interface InputConfiguration {
  audio: TrackConfiguration;
  video: VideoTrackConfiguration;
}

export interface ResolutionInfo {
  name: string;
  dimensions: [number,number],
}
export const resolutions = new Map<string,ResolutionInfo>([
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
]);

function getSourceConstraint<T>(config: TrackConfiguration, other?: T) {
  if(!config.enabled) {
    return false;
  } else if(config.deviceId == null) {
    return {};
  } else {
    return {
      deviceId: config.deviceId,
      ...other,
    };
  }
}

export function sanitizeDeviceId(id: string | undefined, devices?: MediaDeviceInfo[]): string | undefined {
  if(devices == null) {
    return undefined;
  }

  const validId = (checkId: string) => {
    return devices.some((info) => info.deviceId === checkId);
  }

  if(id != null && validId(id)) {
    return id;
  }

  if(devices.length > 0) {
    return devices[0].deviceId;
  }

  return undefined;
}

export function sanitizeTrackConfiguration<T extends TrackConfiguration>(config: T, devices?: MediaDeviceInfo[]) {
  const { deviceId, ...other } = config;

  return {
    deviceId: sanitizeDeviceId(deviceId, devices),
    ...other,
  }
}

export function sanitizeInputConfiguration(config: InputConfiguration, devices?: DeviceMapData) {
  return {
    audio: sanitizeTrackConfiguration(config.audio, devices?.audio),
    video: sanitizeTrackConfiguration(config.video, devices?.video),
  };
}

interface InputControlEvents {
  devicesChanged: DeviceMapData | undefined;
  streamChanged: Promise<Stream> | undefined;
  screenshareChanged: Promise<Stream> | undefined;
}

export class InputControl extends Emittery.Typed<InputControlEvents> {
  protected deviceMapHandler = new DeviceMapHandler();
  protected configuration?: InputConfiguration;
  protected stream?: Promise<Stream>;
  protected screenshare?: Promise<Stream>

  constructor() {
    super();

    this.deviceMapHandler.on('devicesChanged', (devices) => {
      this.emit('devicesChanged', devices);
    });
  }

  async configureStream(config: InputConfiguration) {
    if(equal(this.configuration, config)) {
      console.log('keeping configuration');
      return;
    }

    this.configuration = config;

    if(!config.audio.enabled && !config.video.enabled) {
      this.setStream(undefined);
      return;
    }

    const resInfo = resolutions.get(config.video.resolution);

    const resData = {
      width: { ideal: resInfo?.dimensions[0] },
      height: { ideal: resInfo?.dimensions[1] },
    }

    const constraints: MediaStreamConstraints = {
      audio: getSourceConstraint(config.audio),
      video: getSourceConstraint(config.video, resData),
    };

    if(this.stream) {
      const oldStream = await this.stream;
      oldStream.stop();
    }

    const stream = Stream.createStream(constraints);
    this.setStream(stream);

    stream.then(() => {
      if(!this.deviceMapHandler.fullyLoaded()) {
        this.deviceMapHandler.load();
      }
    });
  }

  getStream() {
    return this.stream;
  }

  private setStream(stream: Promise<Stream> | undefined) {
    if(this.stream != null) {
      this.stream.then((oldStream) => {
        oldStream.stop();
      });
    }

    this.stream = stream;
    this.emit('streamChanged', stream);
  }

  close() {
    if(this.stream != null) {
      this.stream.then((oldStream) => {
        oldStream.stop();
      });
    }

    this.deviceMapHandler.close();
  }

  getDevices() {
    return this.deviceMapHandler.getDevices();
  }
}


