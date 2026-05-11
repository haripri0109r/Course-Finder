  miniUploadZone: {
    height: 100,
    borderRadius: RADIUS.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  miniPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  miniUploadText: {
    ...FONTS.tiny,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  footer: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    padding: SPACING.xl, 
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, 
    borderTopColor: COLORS.borderLight,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  }
});
