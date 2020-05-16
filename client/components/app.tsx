import * as React from 'react';

import { BrowserRouter as Router, Switch, Route, useParams } from 'react-router-dom';



import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/button/styles';
import { Portal } from '@rmwc/base';


import { RTCSignaling, useSignalingState } from './rtc_signaling';
import { Room } from './room';
import { StartPage } from './start_page';

const SIGNALING_ADDRESS = process.env.UWP_SIGNALING ?? "wss://calling.innovailable.eu";

const SIGNALING_OPTIONS = {
  stun: process.env.UWP_STUN ?? "stun:innovailable.eu",
};

const RoomRoute: React.SFC<{}> = () => {
  const { room_name } = useParams();
  if(!room_name){
    return null;
  }
  return <Room room_name={room_name} />
}

export const ConnectionHandler: React.SFC = ({ children }) => {
  const state = useSignalingState();

  if(state == null) {
    return null;
  }

  switch(state) {
    case "idle":
    case "connecting":
      return <div>Connecting ...</div>;

    case "connected":
      return <>{children}</>;

    case "closed":
      return <div>Connection lost</div>;

    case "failed":
      return <div>Unable to connect</div>;
  }
}

export const App: React.SFC = () => {

  return <Router>
    <ThemeProvider
      options={{
        primary: 'red',
        secondary: 'green'
      }}>
      <div className="center_wrapper">
        <RTCSignaling address={SIGNALING_ADDRESS} options={SIGNALING_OPTIONS}>
          <ConnectionHandler>
            <Switch>
              <Route path="/c/:room_name">
                <RoomRoute />
              </Route>
              <Route path="/">
                <StartPage />
              </Route>
            </Switch>
          </ConnectionHandler>
        </RTCSignaling>
      </div>
      <Portal />
    </ThemeProvider>
  </Router>
}
