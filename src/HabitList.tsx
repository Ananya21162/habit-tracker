import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, tilePalette } from './theme';

type Item = { id: string; name: string };

type Props<T extends Item> = {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
};

export function HabitList<T extends Item>({ items, onChange, newItem }: Props<T>) {
  return (
    <View>
      {items.map((item, i) => {
        const [bg, ink] = tilePalette[i % tilePalette.length];
        return (
          <View key={item.id} style={[styles.row, { backgroundColor: bg }]}>
            <TextInput
              style={[styles.input, { color: ink }]}
              value={item.name}
              placeholder={`Habit ${i + 1}`}
              placeholderTextColor={ink + '88'}
              onChangeText={(name) =>
                onChange(items.map((it) => (it.id === item.id ? { ...it, name } : it)))
              }
            />
            <Pressable
              hitSlop={8}
              onPress={() => onChange(items.filter((it) => it.id !== item.id))}
            >
              <Text style={[styles.removeText, { color: ink }]}>✕</Text>
            </Pressable>
          </View>
        );
      })}
      <Pressable style={styles.addBtn} onPress={() => onChange([...items, newItem()])}>
        <Text style={styles.addText}>+ add a habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
  },
  removeText: { fontSize: 14, fontFamily: fonts.bodyBold, opacity: 0.6 },
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  addText: { color: colors.accent, fontSize: 15, fontFamily: fonts.bodyBold },
});
