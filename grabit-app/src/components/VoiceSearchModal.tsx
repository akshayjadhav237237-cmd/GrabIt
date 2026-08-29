import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import { TouchableScale } from './TouchableScale';
import { MicIcon, CloseIcon, SearchIcon } from './icons';
import theme from '../theme';

export interface VoiceSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onQueryResult: (query: string) => void;
}

const DEMO_QUERIES = [
  'Sony A7 Camera',
  'DJI Mavic Drone',
  'Cordless Drill',
  'Wireless Mic',
  'Camping Tent',
  'Projector 4K',
];

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  visible,
  onClose,
  onQueryResult,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Listening for equipment...');
  const [isSupportedOnWeb, setIsSupportedOnWeb] = useState<boolean>(false);

  // Web Speech recognition ref
  const recognitionRef = useRef<any>(null);

  // Pulse animation values for ripple rings
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.6)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.6)).current;

  // Waveform bars animation values
  const barHeights = useRef([
    new Animated.Value(12),
    new Animated.Value(24),
    new Animated.Value(36),
    new Animated.Value(18),
    new Animated.Value(30),
    new Animated.Value(14),
    new Animated.Value(28),
  ]).current;

  // Setup loop animations
  useEffect(() => {
    let rippleLoop: Animated.CompositeAnimation | null = null;
    let waveformLoops: Animated.CompositeAnimation[] = [];

    if (visible) {
      setIsListening(true);
      setSpokenText('');
      setStatusMessage('Listening for equipment...');

      // 1. Ripple animations
      const createRippleAnim = (scaleAnim: Animated.Value, opacityAnim: Animated.Value, delay: number) => {
        return Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 2.1,
                duration: 1800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 1800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ),
        ]);
      };

      rippleLoop = Animated.parallel([
        createRippleAnim(pulseAnim1, pulseOpacity1, 0),
        createRippleAnim(pulseAnim2, pulseOpacity2, 900),
      ]);
      rippleLoop.start();

      // 2. Waveform bars oscillation animations
      const targets = [28, 42, 54, 38, 48, 22, 40];
      const durations = [600, 750, 500, 800, 650, 550, 700];

      waveformLoops = barHeights.map((bar, idx) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: targets[idx],
              duration: durations[idx],
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 8 + (idx % 3) * 4,
              duration: durations[idx] * 0.9,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        loop.start();
        return loop;
      });

      // 3. Web Speech API Initialization if on Web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          setIsSupportedOnWeb(true);
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
              setIsListening(true);
              setStatusMessage('Speak now, listening...');
            };

            recognition.onresult = (event: any) => {
              const current = event.resultIndex;
              const transcript = event.results[current][0].transcript;
              setSpokenText(transcript);
              setStatusMessage(`"${transcript}"`);

              if (event.results[current].isFinal) {
                setTimeout(() => {
                  handleSelectQuery(transcript);
                }, 800);
              }
            };

            recognition.onerror = (event: any) => {
              setStatusMessage('Tap a demo query below or try again');
              setIsListening(false);
            };

            recognition.onend = () => {
              setIsListening(false);
            };

            recognition.start();
            recognitionRef.current = recognition;
          } catch {
            setStatusMessage('Tap a demo query below for instant search');
          }
        } else {
          setIsSupportedOnWeb(false);
          setStatusMessage('Tap a demo query below or speak');
        }
      } else {
        setStatusMessage('Tap a sample query below or speak');
      }
    }

    return () => {
      if (rippleLoop) rippleLoop.stop();
      waveformLoops.forEach((l) => l.stop());
      pulseAnim1.setValue(1);
      pulseOpacity1.setValue(0.6);
      pulseAnim2.setValue(1);
      pulseOpacity2.setValue(0.6);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [visible]);

  const handleSelectQuery = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    onQueryResult(cleanText);
    onClose();
  };

  const handleToggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setStatusMessage('Voice recognition paused');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } else {
      setIsListening(true);
      setStatusMessage('Listening for equipment...');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableScale
          style={styles.modalBackdrop}
          onPress={onClose}
          scaleTo={1}
        />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>Voice Search</Text>
            </View>
            <TouchableScale
              style={styles.closeBtn}
              onPress={onClose}
              scaleTo={0.88}
            >
              <CloseIcon size={20} color={theme.colors.textSecondary} />
            </TouchableScale>
          </View>

          <Text style={styles.headline}>What gear are you looking for?</Text>
          <Text style={styles.subheadline} numberOfLines={2}>
            {spokenText ? `"${spokenText}"` : statusMessage}
          </Text>

          {/* Pulse Microphone Centerpiece */}
          <View style={styles.micSection}>
            {isListening && (
              <>
                <Animated.View
                  style={[
                    styles.rippleCircle,
                    {
                      transform: [{ scale: pulseAnim1 }],
                      opacity: pulseOpacity1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.rippleCircle,
                    {
                      transform: [{ scale: pulseAnim2 }],
                      opacity: pulseOpacity2,
                    },
                  ]}
                />
              </>
            )}

            <TouchableScale
              style={[styles.micButton, isListening && styles.micButtonActive]}
              onPress={handleToggleListening}
              scaleTo={0.92}
            >
              <MicIcon
                size={34}
                color={theme.colors.surface}
              />
            </TouchableScale>
          </View>

          {/* Animated Waveform Visualizer */}
          <View style={styles.waveformContainer}>
            {barHeights.map((bar, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: isListening ? bar : 6,
                    backgroundColor: isListening
                      ? index % 2 === 0
                        ? theme.colors.accent
                        : theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Demo voice query chips for quick 1-tap testing */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Try saying or tap to search:</Text>
            <View style={styles.chipsContainer}>
              {DEMO_QUERIES.map((query) => (
                <TouchableScale
                  key={query}
                  style={styles.demoChip}
                  onPress={() => handleSelectQuery(query)}
                  scaleTo={0.94}
                >
                  <SearchIcon size={12} color={theme.colors.primary} />
                  <Text style={styles.demoChipText}>{query}</Text>
                </TouchableScale>
              ))}
            </View>
          </View>

          {/* Info note */}
          <View style={styles.infoNoteBox}>
            <Text style={styles.infoNoteText}>
              Speech-to-text live mic streaming in standalone mobile builds uses native speech recognition.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  badgeWrap: {
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  headline: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subheadline: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    minHeight: 22,
    paddingHorizontal: theme.spacing.sm,
  },
  micSection: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: theme.spacing.sm,
  },
  rippleCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accentLight,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    zIndex: 2,
  },
  micButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 60,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  waveformBar: {
    width: 5,
    borderRadius: 3,
  },
  demoSection: {
    width: '100%',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  demoTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  demoChipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  infoNoteBox: {
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    marginTop: theme.spacing.xs,
  },
  infoNoteText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default VoiceSearchModal;
