import React from 'react';
import GalleryScreenBase from '../shared/GalleryScreenBase';

function AdminGalleryScreen(props) {
  return <GalleryScreenBase mode="admin" navigation={props.navigation} />;
}

export default AdminGalleryScreen;
