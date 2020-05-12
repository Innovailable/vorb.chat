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
  wrapper?: HTMLElement;
  video?: HTMLVideoElement;

  constructor() {
    this.updateCb = this.update.bind(this);
  }

  stop() {
    this.setWrapper(undefined);
    this.setVideo(undefined);
  }

  update() {
    if(this.video == null || this.wrapper == null) {
      console.log('not running scaler', this.video, this.wrapper);
      return;
    }

    const baseWidth = this.video.videoWidth || 320;
    const baseHeight = this.video.videoHeight || 240;
    const maxWidth = this.wrapper.clientWidth - 8;
    const maxHeight = this.wrapper.clientHeight - 8;

    const ratio = baseWidth / baseHeight;

    const calcWidth = Math.min(maxWidth, maxHeight * ratio);
    const calcHeight = Math.min(maxHeight, maxWidth / ratio);

    this.video.style.width = String(Math.floor(calcWidth));
    this.video.style.height = String(Math.floor(calcHeight));
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

  setWrapper(wrapper: HTMLElement | undefined) {
    if(this.wrapper != null) {
      erd.removeListener(this.wrapper, this.updateCb);
    }

    this.wrapper = wrapper;

    if(this.wrapper != null) {
      this.update();
      erd.listenTo(this.wrapper, this.updateCb);
    }
  }
}

export const useVideoScaler = (options?: Partial<VideoScaleOptions>): [React.RefCallback<HTMLElement>, React.RefCallback<HTMLVideoElement>] => {
  const scaler = useMemo(() => {
    return new VideoScaler();
  }, []);

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
  
  return [wrapperCb, videoCb];
};
