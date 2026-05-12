import React, { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');

export default function CertificateViewerModal({ visible, onClose, uri, title = 'Certificate' }) {
  const { colors } = useAppTheme();
  const [zoom, setZoom] = useState(1);

  const isPdf =
    uri &&
    (String(uri).toLowerCase().includes('.pdf') ||
      String(uri).toLowerCase().includes('application/pdf'));

  const handleShare = useCallback(async () => {
    if (!uri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
          dialogTitle: title,
        });
      } else {
        await Share.share({ message: `${title}\n${uri}`, url: uri });
      }
    } catch {
      await Share.share({ message: `${title}\n${uri}`, url: uri });
    }
  }, [uri, title, isPdf]);

  const openExternal = () => {
    if (uri) Linking.openURL(uri);
  };

  if (!uri) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.black }]}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.toolbarTitle, { color: colors.white }]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {isPdf ? (
          <View style={styles.pdfWrap}>
            <WebView source={{ uri }} style={styles.web} startInLoadingState />
            <View style={[styles.pdfActions, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.actionPill} onPress={openExternal}>
                <Ionicons name="open-outline" size={18} color={colors.accent} />
                <Text style={[styles.actionTxt, { color: colors.accent }]}>Open / Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color={colors.accent} />
                <Text style={[styles.actionTxt, { color: colors.accent }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.imgScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            pinchGestureEnabled
          >
            <Image
              source={{ uri }}
              style={[styles.img, { width: W * zoom, height: H * 0.72 * zoom }]}
              resizeMode="contain"
            />
          </ScrollView>
        )}

        {!isPdf && (
          <View style={[styles.zoomBar, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <TouchableOpacity onPress={() => setZoom((z) => Math.max(1, z - 0.25))} style={styles.zoomBtn}>
              <Ionicons name="remove" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity onPress={() => setZoom((z) => Math.min(3, z + 0.25))} style={styles.zoomBtn}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  iconBtn: { padding: SPACING.sm },
  toolbarTitle: { ...FONTS.bodyBold, flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm },
  imgScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: H * 0.85,
  },
  img: { backgroundColor: 'transparent' },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 24,
  },
  zoomBtn: { padding: SPACING.sm },
  zoomLabel: { ...FONTS.captionBold, color: '#fff', minWidth: 48, textAlign: 'center' },
  pdfWrap: { flex: 1 },
  web: { flex: 1, backgroundColor: '#111' },
  pdfActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionTxt: { ...FONTS.captionBold },
});
