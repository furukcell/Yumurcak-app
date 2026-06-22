import React from 'react';
import GalleryScreenBase from '../shared/GalleryScreenBase';

function ParentGalleryScreen(props) {
  return <GalleryScreenBase mode="parent" navigation={props.navigation} />;
}

export default ParentGalleryScreen;
