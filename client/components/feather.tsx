import * as React from 'react';
import { icons } from 'feather-icons';

interface FeatherIconProps {
	icon: string;
}

export const FeatherIcon: React.SFC<FeatherIconProps> = ({ icon }) => {
	const html = React.useMemo(() => {
		const icon_data = icons[icon];

		if(icon_data == null) {
			return;
		}

		return { __html: icon_data.toSvg() };
	}, [icon]);

	return <span dangerouslySetInnerHTML={html}></span>;
}

