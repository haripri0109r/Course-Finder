import React, { useState } from 'react';
import { Image } from 'react-native';

const SafeImage = ({ source, style, customFallback }) => {
  const [error, setError] = useState(false);

  return (
    <Image
      source={error || !source?.uri
        ? { uri: customFallback || "https://via.placeholder.com/300" }
        : source}
      style={style}
      onError={() => setError(true)}
    />
  );
};

export default SafeImage;
