import * as React from 'react';

import classNames from 'classnames';

export const AwesomeIcon: React.SFC<{icon: string}> = ({icon}) => <i className={classNames("fa", `fa-${icon}`)}></i>;
