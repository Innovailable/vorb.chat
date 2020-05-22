import * as React from 'react';

import { useChatMessages } from './rtc_room';
import { Message, IncomingMessage, OutgoingMessage, StatusMessage } from '../chat';
import { useKeepScrolledDown } from './auto_scroll';


const OutgoingMessageComponent: React.SFC<{ message: OutgoingMessage }> = ({ message }) => {
  // TODO i18n
  return <span className="outgoing_message">
    <div>You: {message.text}</div>
  </span>
}

const IncomingMessageComponent: React.SFC<{ message: IncomingMessage }> = ({ message }) => {
  return <span className="incoming_message">
    <div>{message.from}: {message.text}</div>
  </span>
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
  const [containerRef, endRef] = useKeepScrolledDown(messages);

  const message_views = messages.map((msg, index) => {
    return <div key={index} className="message_wrapper">
      <MessageComponent message={msg} />
    </div>
  });

  return <div ref={containerRef} className="message_list">
    {message_views}
    <div ref={endRef} />
  </div>;
}
