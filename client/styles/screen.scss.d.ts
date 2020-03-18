declare namespace ScreenScssModule {
  export interface IScreenScss {
    app: string;
    container: string;
    content: string;
    footer: string;
    header: string;
    room_wrapper: string;
    root: string;
    self_container: string;
    sidebar: string;
    stage: string;
    user_list: string;
    user_mic: string;
    user_view: string;
  }
}

declare const ScreenScssModule: ScreenScssModule.IScreenScss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: ScreenScssModule.IScreenScss;
};

export = ScreenScssModule;
