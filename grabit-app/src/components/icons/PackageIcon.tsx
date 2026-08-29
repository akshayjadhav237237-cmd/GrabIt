import React from 'react';
import { BoxIcon } from './BoxIcon';
import { IconProps } from './types';

export const PackageIcon: React.FC<IconProps> = (props) => {
  return <BoxIcon {...props} />;
};

export default PackageIcon;
