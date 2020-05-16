import * as React from 'react';
import { useEffect, useMemo, useCallback } from 'react';

import * as elementResizeDetectorMaker from 'element-resize-detector';

export interface VideoScaleOptions {
  tolerance: number;
  trim: number;
}

const defaultVideoScaleOptions: VideoScaleOptions = {
  tolerance: 8,
  trim: 10,
};

var erd = elementResizeDetectorMaker({
  strategy: "object",
});

class VideoScaler {
  updateCb: () => void;
  parent?: HTMLElement;
  wrapper?: HTMLElement;
  video?: HTMLVideoElement;

  constructor() {
    this.updateCb = this.update.bind(this);
  }

  stop() {
    this.setParent(undefined);
    this.setWrapper(undefined);
    this.setVideo(undefined);
  }

  update() {
    if(this.parent == null || this.wrapper == null) {
      return;
    }

    let baseWidth: number;
    let baseHeight: number;

    baseWidth = this.video?.videoWidth || 16;
    baseHeight = this.video?.videoHeight || 9;

    const maxWidth = this.parent.clientWidth - 8;
    const maxHeight = this.parent.clientHeight - 8;

    const ratio = baseWidth / baseHeight;

    const calcWidth = Math.min(maxWidth, maxHeight * ratio);
    const calcHeight = Math.min(maxHeight, maxWidth / ratio);

    this.wrapper.style.width = String(Math.floor(calcWidth));
    this.wrapper.style.height = String(Math.floor(calcHeight));
  }

  setWrapper(wrapper: HTMLElement | undefined) {
    this.wrapper = wrapper;

    if(this.wrapper != null) {
      this.update();
    }
  }

  setVideo(video: HTMLVideoElement | undefined) {
    if(this.video != null) {
      this.video.removeEventListener('playing', this.updateCb);
    }

    this.video = video;

    if(this.video != null) {
      this.update();
      this.video.addEventListener('playing', this.updateCb);
    }
  }

  setParent(parent: HTMLElement | undefined) {
    if(this.parent != null) {
      erd.removeListener(this.parent, this.updateCb);
    }

    this.parent = parent;

    if(this.parent != null) {
      this.update();
      erd.listenTo(this.parent, this.updateCb);
    }
  }
}

export const useVideoScaler = (options?: Partial<VideoScaleOptions>): [React.RefCallback<HTMLElement>, React.RefCallback<HTMLElement>, React.RefCallback<HTMLVideoElement>] => {
  const scaler = useMemo(() => {
    return new VideoScaler();
  }, []);

  const parentCb = useCallback((parent: HTMLElement) => {
    scaler.setParent(parent);
  }, [scaler]);

  const wrapperCb = useCallback((wrapper: HTMLElement) => {
    scaler.setWrapper(wrapper);
  }, [scaler]);

  const videoCb = useCallback((video: HTMLVideoElement) => {
    scaler.setVideo(video);
  }, [scaler]);

  useEffect(() => {
    return () => {
      scaler.stop();
    };
  }, [scaler]);
  
  return [parentCb, wrapperCb, videoCb];
};
