import React from "react";
import { Image, StyleSheet } from "react-native";
import { DEFAULT_IMAGE } from "../config/constants";

const CourseImage = ({ uri, style }) => {
  return (
    <Image
      source={{ uri: uri || DEFAULT_IMAGE }}
      style={[styles.image, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
});

export default CourseImage;
