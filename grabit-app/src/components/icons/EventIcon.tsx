import React from 'react';
import { SpeakerIcon } from './SpeakerIcon';
import { IconProps } from './types';

export const EventIcon: React.FC<IconProps> = (props) => {
  return <SpeakerIcon {...props} />;
};

export default EventIcon;
