import * as Emittery from 'emittery';

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

export interface DeviceMapData {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
}

type DeviceMapHandlerState = 'idle' | 'initial' | 'complete';

interface DeviceMapHandlerEvents {
  devicesChanged: DeviceMapData | undefined;
}

export class DeviceMapHandler extends Emittery.Typed<DeviceMapHandlerEvents> {
  protected devices?: DeviceMapData;
  protected state: DeviceMapHandlerState = 'idle';
  protected abort?: () => void;
  protected cleanup?: () => void;

  constructor() {
    super();
  }

  close() {
    if(this.cleanup != null) {
      this.cleanup();
      delete this.cleanup;
    }

    delete this.devices;
  }

  getDevices() {
    return this.devices;
  }

  async load() {
    // abort handling

    let aborted = false;

    if(this.abort != null) {
      this.abort();
    }

    this.abort = () => {
      aborted = true;
    };

    // change listener

    if(this.cleanup == null) {
      const handler = () => {
        this.load();
      };

      navigator.mediaDevices.addEventListener('devicechange', handler);

      this.cleanup = () => {
        navigator.mediaDevices.removeEventListener('devicechange', handler);
      };
    }

    // actually load devices

    const rawDevices = await navigator.mediaDevices.enumerateDevices();

    const devices = {
      audio: filterDevices(rawDevices, 'audioinput'),
      video: filterDevices(rawDevices, 'videoinput'),
    }

    // abort called?

    if(!aborted) {
      // apply data

      this.devices = devices;
      this.emit('devicesChanged', this.devices);
    }

    return devices;
  }

  loaded() {
    return this.devices == null;
  }

  fullyLoaded() {
    if(this.devices == null) {
      return false;
    }

    for(const devices of Object.values(this.devices)) {
      for(const device of devices) {
        if(device.label) {
          return true;
        }
      }
    }

    return false;
  }
}
