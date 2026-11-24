import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HabitList } from './src/HabitList';
import {
  Challenge,
  Habit,
  activeHabits,
  clearChallenge,
  currentDay,
  dayStatus,
  fullDaysCount,
  habitStreak,
  isDone,
  loadChallenge,
  newId,
  overallStreak,
  saveChallenge,
  todayClamped,
  todayString,
  toggleHabit,
} from './src/storage';
import { taskForDay } from './src/tasks';
import { colors, fonts, radius, shadow, tilePalette } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenge()
      .then(setChallenge)
      .finally(() => setLoading(false));
  }, []);

  const update = (c: Challenge | null) => {
    setChallenge(c);
    if (c) saveChallenge(c);
    else clearChallenge();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        {loading || !fontsLoaded ? null : challenge ? (
          <Dashboard challenge={challenge} onChange={update} />
        ) : (
          <Setup onStart={update} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Setup({ onStart }: { onStart: (c: Challenge) => void }) {
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState('30');
  const [habits, setHabits] = useState<Habit[]>(() =>
    Array.from({ length: 5 }, () => ({ id: newId(), name: '', addedOnDay: 1 })),
  );

  const total = parseInt(days, 10);
  const cleaned = habits
    .map((h) => ({ ...h, name: h.name.trim() }))
    .filter((h) => h.name.length > 0);
  const valid = name.trim().length > 0 && total >= 1 && total <= 365 && cleaned.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>a new chapter</Text>
      <Text style={styles.hugeTitle}>
        Lock <Text style={styles.italic}>in.</Text>
      </Text>
      <Text style={styles.subtitle}>
        Choose the little things you'll show up for every day, and how long you'll keep going.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Your name (optional)</Text>
        <TextInput
          style={styles.input}
          value={owner}
          onChangeText={setOwner}
          placeholder="e.g. Ananya"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>Name your challenge</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. 30-day lock-in"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>How many days?</Text>
        <TextInput
          style={styles.input}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily habits</Text>
        <Text style={styles.cardHint}>Add, rename or remove these anytime.</Text>
        <HabitList
          items={habits}
          onChange={setHabits}
          newItem={() => ({ id: newId(), name: '', addedOnDay: 1 })}
        />
      </View>

      <Pressable
        disabled={!valid}
        style={[styles.primaryBtn, !valid && styles.btnDisabled]}
        onPress={() =>
          onStart({
            owner: owner.trim() || undefined,
            name: name.trim(),
            totalDays: total,
            startDate: todayString(),
            habits: cleaned,
            log: {},
          })
        }
      >
        <Text style={styles.primaryBtnText}>Begin</Text>
      </Pressable>
    </ScrollView>
  );
}

function Dashboard({
  challenge,
  onChange,
}: {
  challenge: Challenge;
  onChange: (c: Challenge | null) => void;
}) {
  const { totalDays } = challenge;
  const finished = currentDay(challenge) > totalDays;
  const today = todayClamped(challenge);

  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Habit[]>([]);
  const [noteHeight, setNoteHeight] = useState(96);

  const viewDay = selected ?? today;
  const active = activeHabits(challenge, viewDay);
  const doneCount = active.filter((h) => isDone(challenge, viewDay, h.id)).length;
  const dayComplete = active.length > 0 && doneCount === active.length;
  const fullDays = fullDaysCount(challenge);
  const streak = overallStreak(challenge);
  const overallPct = Math.round((fullDays / totalDays) * 100);

  const startEdit = () => {
    setDraft(challenge.habits);
    setEditing(true);
  };

  const saveEdit = () => {
    const cleaned = draft
      .map((h) => ({ ...h, name: h.name.trim() }))
      .filter((h) => h.name.length > 0);
    if (cleaned.length > 0) onChange({ ...challenge, habits: cleaned });
    setEditing(false);
  };

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Reset this challenge? Progress will be lost.')) {
        onChange(null);
      }
      return;
    }
    Alert.alert('Reset challenge?', 'Progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => onChange(null) },
    ]);
  };

  const columns: Habit[][] = [[], []];
  active.forEach((h, i) => columns[i % 2].push(h));

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroEyebrow}>
          {challenge.owner ? `${challenge.owner} · ` : ''}
          {finished ? 'complete' : `day ${today} of ${totalDays}`}
        </Text>
        <Text style={styles.heroTitle}>{challenge.name}</Text>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroBig}>{streak}</Text>
            <Text style={styles.heroBigLabel}>day streak</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroPct}>{overallPct}%</Text>
            <Text style={styles.heroBigLabel}>
              {fullDays}/{totalDays} perfect days
            </Text>
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(overallPct, 3)}%` }]} />
        </View>
      </LinearGradient>

      {editing ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit habits</Text>
          <Text style={styles.cardHint}>
            New habits count from today, so your past streak stays safe.
          </Text>
          <HabitList
            items={draft}
            onChange={setDraft}
            newItem={() => ({ id: newId(), name: '', addedOnDay: today })}
          />
          <View style={styles.editActions}>
            <Pressable style={[styles.primaryBtn, styles.flex]} onPress={saveEdit}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </Pressable>
            <Pressable style={[styles.ghostBtn, styles.flex]} onPress={() => setEditing(false)}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {viewDay === today ? 'Today' : `Day ${viewDay}`}
              </Text>
              <Text style={styles.sectionHint}>
                {dayComplete ? 'everything done, beautiful' : `${doneCount} of ${active.length} done`}
              </Text>
            </View>
            <Pressable style={styles.pill} onPress={startEdit}>
              <Text style={styles.pillText}>edit habits</Text>
            </Pressable>
          </View>

          <View style={styles.masonry}>
            {columns.map((col, c) => (
              <View key={c} style={styles.column}>
                {col.map((h) => {
                  const idx = challenge.habits.findIndex((x) => x.id === h.id);
                  const [bg, ink, fill] = tilePalette[idx % tilePalette.length];
                  const done = isDone(challenge, viewDay, h.id);
                  const hs = habitStreak(challenge, h);
                  const tall = idx % 3 === 0;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => onChange(toggleHabit(challenge, viewDay, h.id))}
                      style={[
                        styles.tile,
                        { backgroundColor: bg, minHeight: tall ? 170 : 128 },
                        done && styles.tileDone,
                      ]}
                    >
                      <View
                        style={[
                          styles.check,
                          { borderColor: ink },
                          done && { backgroundColor: fill, borderColor: fill },
                        ]}
                      >
                        {done ? <Text style={styles.tick}>✓</Text> : null}
                      </View>
                      <Text
                        style={[
                          styles.tileName,
                          { color: ink },
                          done && styles.tileNameDone,
                        ]}
                      >
                        {h.name}
                      </Text>
                      <Text style={[styles.tileStreak, { color: ink }]}>
                        {hs > 0 ? `${hs} day streak` : 'start today'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>day {viewDay} intention</Text>
            <Text style={styles.quoteText}>{taskForDay(viewDay)}</Text>
            <TextInput
              style={[styles.noteInput, { height: Math.max(96, noteHeight) }]}
              onContentSizeChange={(e) => setNoteHeight(e.nativeEvent.contentSize.height)}
              scrollEnabled={false}
              value={challenge.notes?.[String(viewDay)] ?? ''}
              onChangeText={(t) =>
                onChange({
                  ...challenge,
                  notes: { ...challenge.notes, [String(viewDay)]: t },
                })
              }
              placeholder="Write your thoughts here..."
              placeholderTextColor={colors.muted}
              multiline
            />
          </View>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your journey</Text>
        <View style={styles.legend}>
          <Legend color={colors.green} label="all done" />
          <Legend color={colors.amber} label="partial" />
          <Legend color={colors.red} label="missed" />
        </View>
        <View style={styles.grid}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const reachable = d <= today;
            const status = dayStatus(challenge, d);
            const isToday = d === today && !finished;
            const full = reachable && status === 'full';
            return (
              <Pressable
                key={d}
                disabled={!reachable}
                onPress={() => setSelected(d === today ? null : d)}
                style={[
                  styles.cell,
                  full && styles.cellDone,
                  reachable && status === 'partial' && styles.cellPartial,
                  reachable && status === 'none' && d < today && styles.cellMissed,
                  !reachable && styles.cellFuture,
                  isToday && styles.cellToday,
                  d === viewDay && styles.cellSelected,
                ]}
              >
                <Text style={[styles.cellText, full && styles.cellTextDone]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={confirmReset}>
        <Text style={styles.reset}>reset challenge</Text>
      </Pressable>
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 18 },
  scroll: { paddingTop: 22, paddingBottom: 56 },
  flex: { flex: 1 },

  eyebrow: {
    color: colors.accent,
    fontSize: 15,
    fontFamily: fonts.displayItalic,
  },
  hugeTitle: {
    color: colors.ink,
    fontSize: 52,
    fontFamily: fonts.display,
    marginTop: 2,
  },
  italic: { fontFamily: fonts.displayItalic, color: colors.accent },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.body,
    marginTop: 8,
    marginBottom: 24,
  },

  hero: {
    borderRadius: radius.lg,
    padding: 24,
    marginBottom: 22,
    ...shadow,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: fonts.displayItalic },
  heroTitle: { color: colors.white, fontSize: 30, fontFamily: fonts.display, marginTop: 2 },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 18,
  },
  heroBig: { color: colors.white, fontSize: 64, fontFamily: fonts.display, lineHeight: 68 },
  heroBigLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontFamily: fonts.bodyMedium },
  heroRight: { alignItems: 'flex-end' },
  heroPct: { color: colors.white, fontSize: 32, fontFamily: fonts.display },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.white },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: { color: colors.ink, fontSize: 30, fontFamily: fonts.display },
  sectionHint: { color: colors.muted, fontSize: 14, fontFamily: fonts.displayItalic, marginTop: 2 },
  pill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { color: colors.accentDeep, fontSize: 13, fontFamily: fonts.bodyBold },

  masonry: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  column: { flex: 1, gap: 12 },
  tile: {
    borderRadius: radius.md,
    padding: 16,
    justifyContent: 'space-between',
    ...shadow,
  },
  tileDone: { opacity: 0.8 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  tick: { color: colors.white, fontSize: 15, fontFamily: fonts.bodyBold },
  tileName: { fontSize: 19, lineHeight: 24, fontFamily: fonts.display },
  tileNameDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  tileStreak: { fontSize: 12, fontFamily: fonts.bodyMedium, opacity: 0.7, marginTop: 10 },

  quote: {
    marginTop: 18,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 22,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    ...shadow,
  },
  quoteLabel: { color: colors.accent, fontSize: 14, fontFamily: fonts.displayItalic },
  noteInput: {
    marginTop: 14,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.cardAlt,
    textAlignVertical: 'top',
    overflow: 'hidden',
  },
  quoteText: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 27,
    fontFamily: fonts.display,
    marginTop: 6,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 20,
    ...shadow,
  },
  cardTitle: { color: colors.ink, fontSize: 22, fontFamily: fonts.display },
  cardHint: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.displayItalic,
    marginTop: 2,
    marginBottom: 14,
  },
  label: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, marginBottom: 8, marginTop: 6 },
  input: {
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    backgroundColor: colors.cardAlt,
    marginBottom: 10,
  },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    ...shadow,
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontFamily: fonts.bodyBold },
  ghostBtn: {
    backgroundColor: colors.cardAlt,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ghostBtnText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bodyBold },
  btnDisabled: { opacity: 0.4 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  legend: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellDone: { backgroundColor: colors.green },
  cellPartial: { backgroundColor: '#f6e2bd' },
  cellMissed: { backgroundColor: '#f3d3d3' },
  cellFuture: { opacity: 0.45 },
  cellToday: { borderColor: colors.accent },
  cellSelected: { borderColor: colors.ink },
  cellText: { color: colors.ink, fontSize: 14, fontFamily: fonts.bodyBold },
  cellTextDone: { color: colors.white },

  reset: { color: colors.muted, textAlign: 'center', fontSize: 13, fontFamily: fonts.displayItalic },
});
