import * as React from 'react';
import { useEffect } from 'react';

import * as elementResizeDetectorMaker from 'element-resize-detector';

export interface VideoScaleOptions {
  tolerance: number;
  trim: number;
}

const defaultVideoScaleOptions: VideoScaleOptions = {
  tolerance: 0,
  trim: 10,
};

var erd = elementResizeDetectorMaker({
  strategy: "scroll",
});

export const useVideoScaler = (videoRef: React.RefObject<HTMLVideoElement>, wrapperRef: React.RefObject<HTMLElement>, options?: Partial<VideoScaleOptions>) => {
  const appliedOptions: VideoScaleOptions = options != null ? { ...defaultVideoScaleOptions, ...options } : defaultVideoScaleOptions;

  const wrapper = wrapperRef.current;
  const video = videoRef.current;

  useEffect(() => {
    if(video == null || wrapper == null) {
      console.log('Unable to setup video scaler');
      return;
    }

    const adjustSize = () => {
      const trimFactor = 1 - appliedOptions.tolerance / 100;

      const baseWidth = video.videoWidth || 320;
      const baseHeight = video.videoHeight || 240;
      const maxWidth = wrapper.clientWidth - appliedOptions.tolerance;
      const maxHeight = wrapper.clientHeight - appliedOptions.tolerance;

      const ratio = baseWidth / baseHeight;

      const calcWidth = Math.min(maxWidth, maxHeight * ratio);
      const calcHeight = Math.min(maxHeight, maxWidth / ratio);

      video.style.width = String(Math.floor(calcWidth));
      video.style.height = String(Math.floor(calcHeight));
    };

    adjustSize();
    erd.listenTo(wrapper, adjustSize);
    video.addEventListener('playing', adjustSize);

    return () => {
      erd.removeListener(wrapper, adjustSize);
      video.removeEventListener('playing', adjustSize);
    };
  }, [wrapper, video, options]);
};
