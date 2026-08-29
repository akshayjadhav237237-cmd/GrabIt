import React from 'react';
import { PowerToolIcon } from './PowerToolIcon';
import { IconProps } from './types';

export const ToolIcon: React.FC<IconProps> = (props) => {
  return <PowerToolIcon {...props} />;
};

export default ToolIcon;
