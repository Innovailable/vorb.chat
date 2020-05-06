import * as React from 'react';
import { useState, useCallback } from 'react';

import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import '@rmwc/dialog/styles';

const privacyHtml = { __html: require('./privacy_policy_text.md') };
const imprintHtml = { __html: require('./imprint_text.md') };

interface TextModalProps {
  title: string;
  html: { __html: string; };
  close: () => void;
}

const TextModal: React.SFC<TextModalProps> = ({ title, html, close }) => {
  return <Dialog open={true} onClose={close} autoDetectWindowHeight={false} autoScrollBodyContent={false}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <div dangerouslySetInnerHTML={html} />
    </DialogContent>
    <DialogActions>
      <DialogButton onClick={close} action="accept" isDefaultAction>Close</DialogButton>
    </DialogActions>
  </Dialog>;
};

type ModalState = 'idle' | 'privacy' | 'imprint';

export const Footer: React.SFC = () => {
  const [modal, setModal] = useState<ModalState>('idle');

  const handlePrivacy = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setModal('privacy');
  }, []);

  const handleImprint = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setModal('imprint');
  }, []);

  const handleClose = useCallback(() => {
    setModal('idle');
  }, []);

  let modalView: React.ReactNode;

  switch(modal) {
    case 'privacy':
      modalView = <TextModal title="Privacy Policy" html={privacyHtml} close={handleClose} />;
      break;

    case 'imprint':
      modalView = <TextModal title="Imprint" html={imprintHtml} close={handleClose} />;
      break;

    case 'idle':
      modalView = null;
      break;
  }

  return <div className="footer">
    {modalView}
    <div className="links">
      An open source project by <a href="https://innovailable.eu">Innovailable</a>
      &nbsp;|&nbsp;
      <a href="#" onClick={handlePrivacy}>Privacy Policy</a>
      &nbsp;|&nbsp;
      <a href="#" onClick={handleImprint}>Imprint</a>
    </div>
  </div>;
};


