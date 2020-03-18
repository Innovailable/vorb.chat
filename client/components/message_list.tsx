import * as React from 'react';

import { useChatMessages } from './rtc_room';
import { Message, IncomingMessage, OutgoingMessage, StatusMessage } from '../chat';


const OutgoingMessageComponent: React.SFC<{ message: OutgoingMessage }> = ({ message }) => {
  // TODO i18n
  return <>
    <div className="message_user">You</div>
    <div className="message_text">{message.text}</div>
  </>
}

const IncomingMessageComponent: React.SFC<{ message: IncomingMessage }> = ({ message }) => {
  return <>
    <div className="message_user">{message.from}</div>
    <div className="message_text">{message.text}</div>
  </>
}

const StatusMessageComponent: React.SFC<{ message: StatusMessage }> = ({ message }) => {
  let action: string;

  // TODO i18n
  switch(message.what) {
    case "enter": {
      action = "joined"
      break;
    }

    case "leave": {
      action = "left"
      break;
    }
  }

  return <div className="message_status">
    User {message.who} {action}
  </div>;
}

const MessageComponent: React.SFC<{ message: Message }> = ({ message }) => {
  switch(message.type) {
    case "incoming":
      return <IncomingMessageComponent message={message} />

    case "outgoing":
      return <OutgoingMessageComponent message={message} />

    case "status":
      return <StatusMessageComponent message={message} />
  }
}

export const MessageList: React.SFC = () => {
  const messages = useChatMessages();

  const message_views = messages.map((msg, index) => {
    return <div key={index} className="message_wrapper">
      <MessageComponent message={msg} />
    </div>
  });

  return <div>
    {message_views}
  </div>;
}
