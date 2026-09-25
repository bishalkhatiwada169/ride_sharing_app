import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, radius, spacing, typography} from '../theme/tokens';

/**
 * MAP-1: Google Maps surface. Same outer API as the former placeholder so
 * Home / Booking / ActiveRide layouts stay unchanged.
 *
 * GPS, markers, routing, and Places are intentionally out of scope.
 */

/** Static Kathmandu center — no device location in MAP-1. */
const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

type Props = {
  label?: string;
  height?: number;
};

export function MapPlaceholder({
  label = 'Map',
  height = 180,
}: Props) {
  return (
    <View
      style={[styles.box, {height}]}
      accessibilityLabel={label || 'Map'}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={KATHMANDU}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      />
      {label ? (
        <View style={styles.labelChip} pointerEvents="none">
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    backgroundColor: colors.mapPlaceholder,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  labelChip: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  label: {...typography.caption, color: colors.mapPlaceholderInk},
});
