import * as React from 'react';
import { icons } from 'feather-icons';

interface FeatherIconProps extends React.HTMLProps<HTMLSpanElement> {
  icon: string;
}

export const FeatherIcon: React.SFC<FeatherIconProps> = ({ icon, ...other }) => {
  const html = React.useMemo(() => {
    const icon_data = icons[icon];

    if(icon_data == null) {
      return;
    }

    return { __html: icon_data.toSvg() };
  }, [icon]);

  return <span {...other} dangerouslySetInnerHTML={html}></span>;
}

