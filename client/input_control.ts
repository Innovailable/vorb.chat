import * as Emittery from 'emittery';
import * as equal from 'fast-deep-equal';
import * as merge from 'deepmerge';
import { produce } from 'immer';
import { DeviceMapData, DeviceMapHandler } from './device_map';
import { Stream } from 'rtc-lib';

export interface ResolutionInfo {
  name: string;
  dimensions: [number,number],
}

export const resolutions = {
  "qvga": {
    name: "QVGA",
    dimensions: [320, 240],
  },
  "vga": {
    name: "VGA",
    dimensions: [640, 480],
  },
  "720p": {
    name: "HD",
    dimensions: [1280, 720],
  },
  "1080p": {
    name: "Full HD",
    dimensions: [1920, 1080],
  },
  "4k": {
    name: "UHD 4k",
    dimensions: [3180, 2160],
  },
};

export type ResolutionKey = keyof typeof resolutions;

export const defaultResolution: ResolutionKey = '720p';

export interface TrackConfiguration {
  enabled: boolean;
  deviceId?: string;
}

export interface VideoTrackConfiguration extends TrackConfiguration {
  resolution: ResolutionKey;
}

export interface InputConfiguration {
  audio: TrackConfiguration;
  video: VideoTrackConfiguration;
}

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

async function stopStream(streamPromise: Promise<Stream | undefined>) {
  try {
    const stream = await streamPromise;
    stream?.stop();
  } catch {
  }
}

export type TrackKind = 'audio' | 'video';

interface StreamResolverEvents {
  promiseChanged: Promise<Stream | undefined> | undefined;
  streamChanged: Stream | undefined;
}

class StreamResolver extends Emittery.Typed<StreamResolverEvents> {
  stream: Stream | undefined;
  promise: Promise<Stream | undefined> | undefined;

  constructor(stream?: Promise<Stream>) {
    super();

    this.setPromise(stream);
  }

  setPromise(promise: Promise<Stream | undefined> | undefined) {
    this.promise = promise;
    this.emit('promiseChanged', promise);

    if(promise == null) {
      this.stream = undefined;
      this.emit('streamChanged', undefined);
      return;
    }

    promise
      .then((stream) => {
        if(this.promise !== promise) {
          return;
        }

        this.stream = stream;
        this.emit('streamChanged', stream);
      })
      .catch((err) => {
        if(this.promise !== promise) {
          return;
        }

        this.stream = undefined;
        this.emit('streamChanged', undefined);
      });
  }
}

interface InputControlEvents {
  devicesChanged: DeviceMapData | undefined;
  streamChanged: Stream | undefined;
  screenshareChanged: Stream | undefined;
  configurationChanged: InputConfiguration | undefined;
  screensharingChanged: boolean;
}

export class InputControl extends Emittery.Typed<InputControlEvents> {
  protected deviceMapHandler = new DeviceMapHandler();
  protected configuration: InputConfiguration;
  protected appliedConfiguration?: InputConfiguration;
  protected streamResolver = new StreamResolver();
  protected screenshareResolver = new StreamResolver();

  constructor() {
    super();

    this.configuration = this.load();

    this.streamResolver.on('streamChanged', (stream) => {
      this.emit('streamChanged', stream);
    });

    this.screenshareResolver.on('streamChanged', (stream) => {
      this.emit('screenshareChanged', stream);
    });

    this.screenshareResolver.on('promiseChanged', () => {
      this.emit('screensharingChanged', this.isScreensharing());
    });

    this.deviceMapHandler.on('devicesChanged', (devices) => {
      this.emit('devicesChanged', devices);
      this.emit('configurationChanged', this.getConfiguration());
    });

    this.on('configurationChanged', () => {
      this.applyConfiguration();
    });

    this.init();
  }

  private async init() {
    try {
      await this.deviceMapHandler.load();
    } catch {}

    this.applyConfiguration();
  }

  private load(): InputConfiguration {
    const defaultConfig = {
      audio: {
        deviceId: undefined,
        enabled: true,
      },
      video: {
        deviceId: undefined,
        enabled: true,
        resolution: defaultResolution,
      },
    };

    let loadedConfig: InputConfiguration | undefined;
    const loadedConfigRaw = localStorage.getItem("config");

    if(loadedConfigRaw != null) {
      try {
        loadedConfig = JSON.parse(loadedConfigRaw);
      } catch {}
    }

    if(loadedConfig != null) {
      return merge(defaultConfig, loadedConfig);
    } else {
      return defaultConfig;
    }
  }

  private save() {
    localStorage.setItem("config", JSON.stringify(this.configuration));
  }

  getConfiguration() {
    return sanitizeInputConfiguration(this.configuration, this.getDevices());
  }

  setConfiguration(config: InputConfiguration) {
    this.configuration = config;
    this.emit('configurationChanged', this.getConfiguration());
    this.save();
  }

  private applyConfiguration() {
    const config = this.getConfiguration();

    if(equal(this.appliedConfiguration, config)) {
      return;
    }

    if(!config.audio.enabled && !config.video.enabled) {
      this.stopStream();

      this.streamResolver.setPromise(undefined);
      return;
    }

    try {
      const stream = this.createStream(config, );
      this.streamResolver.setPromise(stream);
    } catch(err) {
      console.log('Unable to get user media');
      this.streamResolver.setPromise(undefined);
    }

    this.appliedConfiguration = config;
  }

  setDeviceId(kind: TrackKind, deviceId: string | undefined, forceEnable = false) {
    const config = produce(this.configuration, (draft) => {
      const trackConfig = draft[kind];

      trackConfig.deviceId = deviceId;

      if(forceEnable) {
        trackConfig.enabled = true;
      }
    });

    this.setConfiguration(config);
  }

  setDeviceEnabled(kind: TrackKind, enabled: boolean) {
    const config = produce(this.configuration, (draft) => {
      draft[kind].enabled = enabled;
    });

    this.setConfiguration(config);
  }

  setResolution(resolution: ResolutionKey) {
    const config = produce(this.configuration, (draft) => {
      draft.video.resolution = resolution;
    });

    this.setConfiguration(config);
  }

  private async createVideoTrack(config: VideoTrackConfiguration): Promise<MediaStreamTrack | undefined> {
    try {
      if(!config.enabled) {
        return;
      }

      const resInfo = resolutions[config.resolution];

      const resData = {
        width: { ideal: resInfo?.dimensions[0] },
        height: { ideal: resInfo?.dimensions[1] },
      };

      const constraints: MediaStreamConstraints = {
        video: getSourceConstraint(config, resData),
      };

      const stream = await Stream.createStream(constraints);

      return stream.getTracks('video')[0];
    } catch(err) {
      console.log(err);
      return;
    }
  }

  private async createAudioTrack(config: TrackConfiguration): Promise<MediaStreamTrack | undefined> {
    try {
      if(!config.enabled) {
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: getSourceConstraint(config),
      };

      const stream = await Stream.createStream(constraints);

      return stream.getTracks('audio')[0];
    } catch(err) {
      console.log(err);
      return;
    }
  }

  private async createStream(config: InputConfiguration): Promise<Stream | undefined> {
    // what changed?

    const audioChanged = !equal(config.audio, this.appliedConfiguration?.audio);
    const videoChanged = !equal(config.video, this.appliedConfiguration?.video);

    // get old media

    const oldStream = await this.streamResolver.promise;

    const oldAudio = oldStream?.getTracks('audio')[0];
    const oldVideo = oldStream?.getTracks('video')[0];

    // stop tracks we replace

    if(audioChanged) {
      oldAudio?.stop();
    }

    if(videoChanged) {
      oldVideo?.stop();
    }

    // get new tracks

    const audioTrack = audioChanged ? await this.createAudioTrack(config.audio) : oldAudio;
    const videoTrack = videoChanged ? await this.createVideoTrack(config.video) : oldVideo;

    // create stram

    const mediaStream = new MediaStream();

    for(const track of [audioTrack, videoTrack]) {
      if(track != null) {
        mediaStream.addTrack(track);
      }
    }

    // let's have another shot at the device list ...

    if(!this.deviceMapHandler.fullyLoaded()) {
      this.deviceMapHandler.load();
    }

    // done

    if(audioTrack != null || videoTrack != null) {
      return new Stream(mediaStream);
    } else {
      return;
    }
  }

  async stopStream() {
    if(this.streamResolver.promise) {
      await stopStream(this.streamResolver.promise);
    }
  }

  getStream() {
    return this.streamResolver.stream;
  }

  async startScreenshare() {
    if(this.screenshareResolver.promise != null) {
      return;
    }

    // TODO remove once fixed in typescript
    // @ts-ignore
    const screenshare: Promise<Stream> = navigator.mediaDevices.getDisplayMedia({video: true}).then((ms) => new Stream(ms));
    this.screenshareResolver.setPromise(screenshare);
  }

  async stopScreenshare() {
    if(this.screenshareResolver.promise != null) {
      const screenshare = this.screenshareResolver.promise;
      this.screenshareResolver.setPromise(undefined);
      await stopStream(screenshare);
    }
  }

  toggleScreenshare() {
    if(this.isScreensharing()) {
      return this.stopScreenshare();
    } else {
      return this.startScreenshare();
    }
  }

  isScreensharing() {
    return this.screenshareResolver.promise != null;
  }

  getScreenshare() {
    return this.screenshareResolver.stream;
  }

  close() {
    this.stopStream();
    this.streamResolver.setPromise(undefined);

    this.stopScreenshare();

    this.deviceMapHandler.close();
  }

  getDevices() {
    return this.deviceMapHandler.getDevices();
  }
}
