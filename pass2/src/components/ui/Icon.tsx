import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {colors} from '../../theme/tokens';

export type IconName =
  | 'home'
  | 'history'
  | 'shield'
  | 'user'
  | 'search'
  | 'locate'
  | 'chevronRight'
  | 'pin'
  | 'car'
  | 'close';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/**
 * Lightweight geometric icons — no icon font dependency.
 * Stroke-style shapes for consistent weight across the app.
 */
export function Icon({
  name,
  size = 22,
  color = colors.text,
  style,
}: Props) {
  const stroke = color;
  const s = size;

  if (name === 'locate') {
    return (
      <View style={[{width: s, height: s}, style]} accessibilityElementsHidden>
        <View
          style={[
            styles.circle,
            {
              width: s * 0.72,
              height: s * 0.72,
              borderRadius: s,
              borderColor: stroke,
              borderWidth: Math.max(2, s * 0.09),
              alignSelf: 'center',
              marginTop: s * 0.14,
            },
          ]}>
          <View
            style={{
              width: s * 0.22,
              height: s * 0.22,
              borderRadius: s,
              backgroundColor: stroke,
            }}
          />
        </View>
      </View>
    );
  }

  if (name === 'search') {
    return (
      <View style={[{width: s, height: s, justifyContent: 'center'}, style]}>
        <View
          style={{
            width: s * 0.58,
            height: s * 0.58,
            borderRadius: s,
            borderWidth: Math.max(2, s * 0.1),
            borderColor: stroke,
            marginLeft: s * 0.08,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: s * 0.32,
            height: Math.max(2, s * 0.1),
            backgroundColor: stroke,
            right: s * 0.06,
            bottom: s * 0.18,
            transform: [{rotate: '45deg'}],
            borderRadius: 2,
          }}
        />
      </View>
    );
  }

  if (name === 'user') {
    return (
      <View style={[{width: s, height: s, alignItems: 'center'}, style]}>
        <View
          style={{
            width: s * 0.36,
            height: s * 0.36,
            borderRadius: s,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            marginTop: s * 0.08,
          }}
        />
        <View
          style={{
            width: s * 0.62,
            height: s * 0.34,
            borderTopLeftRadius: s * 0.35,
            borderTopRightRadius: s * 0.35,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            borderBottomWidth: 0,
            marginTop: s * 0.08,
          }}
        />
      </View>
    );
  }

  if (name === 'home') {
    return (
      <View style={[{width: s, height: s, alignItems: 'center'}, style]}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: s * 0.38,
            borderRightWidth: s * 0.38,
            borderBottomWidth: s * 0.32,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: stroke,
            marginTop: s * 0.06,
          }}
        />
        <View
          style={{
            width: s * 0.56,
            height: s * 0.4,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            borderTopWidth: 0,
            marginTop: -1,
          }}
        />
      </View>
    );
  }

  if (name === 'history') {
    return (
      <View style={[{width: s, height: s, justifyContent: 'center', alignItems: 'center'}, style]}>
        <View
          style={{
            width: s * 0.72,
            height: s * 0.72,
            borderRadius: s,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: s * 0.14,
          }}>
          <View style={{width: Math.max(2, s * 0.09), height: s * 0.22, backgroundColor: stroke}} />
          <View
            style={{
              width: s * 0.22,
              height: Math.max(2, s * 0.09),
              backgroundColor: stroke,
              marginLeft: s * 0.12,
              marginTop: -Math.max(2, s * 0.09),
            }}
          />
        </View>
      </View>
    );
  }

  if (name === 'shield') {
    return (
      <View style={[{width: s, height: s, alignItems: 'center'}, style]}>
        <View
          style={{
            width: s * 0.58,
            height: s * 0.7,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            borderBottomLeftRadius: s * 0.35,
            borderBottomRightRadius: s * 0.35,
            borderTopLeftRadius: s * 0.12,
            borderTopRightRadius: s * 0.12,
            marginTop: s * 0.1,
          }}
        />
      </View>
    );
  }

  if (name === 'pin') {
    return (
      <View style={[{width: s, height: s, alignItems: 'center'}, style]}>
        <View
          style={{
            width: s * 0.48,
            height: s * 0.48,
            borderRadius: s,
            borderWidth: Math.max(2, s * 0.09),
            borderColor: stroke,
            marginTop: s * 0.06,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: s * 0.16,
              height: s * 0.16,
              borderRadius: s,
              backgroundColor: stroke,
            }}
          />
        </View>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: s * 0.14,
            borderRightWidth: s * 0.14,
            borderTopWidth: s * 0.22,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: stroke,
            marginTop: -2,
          }}
        />
      </View>
    );
  }

  if (name === 'car') {
    return (
      <View style={[{width: s, height: s, justifyContent: 'center'}, style]}>
        <View
          style={{
            height: s * 0.28,
            marginHorizontal: s * 0.12,
            borderRadius: 4,
            borderWidth: Math.max(2, s * 0.08),
            borderColor: stroke,
          }}
        />
        <View
          style={{
            height: s * 0.22,
            marginHorizontal: s * 0.04,
            marginTop: 2,
            borderRadius: 4,
            borderWidth: Math.max(2, s * 0.08),
            borderColor: stroke,
          }}
        />
      </View>
    );
  }

  if (name === 'chevronRight') {
    return (
      <View style={[{width: s, height: s, justifyContent: 'center', alignItems: 'center'}, style]}>
        <View
          style={{
            width: s * 0.32,
            height: s * 0.32,
            borderTopWidth: Math.max(2, s * 0.1),
            borderRightWidth: Math.max(2, s * 0.1),
            borderColor: stroke,
            transform: [{rotate: '45deg'}],
          }}
        />
      </View>
    );
  }

  // close
  return (
    <View style={[{width: s, height: s, justifyContent: 'center', alignItems: 'center'}, style]}>
      <View
        style={{
          position: 'absolute',
          width: s * 0.62,
          height: Math.max(2, s * 0.1),
          backgroundColor: stroke,
          transform: [{rotate: '45deg'}],
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: s * 0.62,
          height: Math.max(2, s * 0.1),
          backgroundColor: stroke,
          transform: [{rotate: '-45deg'}],
          borderRadius: 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {alignItems: 'center', justifyContent: 'center'},
});
