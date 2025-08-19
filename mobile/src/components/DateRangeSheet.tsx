import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (range: { start: string; end: string }) => void;
  initialStart?: string | null;
  initialEnd?: string | null;
};

const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatRangeLabel(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sStr = `${String(s.getDate()).padStart(2,"0")} ${monthShort[s.getMonth()]}`;
  const eStr = `${String(e.getDate()).padStart(2,"0")} ${monthShort[e.getMonth()]}`;
  return `${sStr} — ${eStr}`;
}

export default function DateRangeSheet({ visible, onClose, onSave, initialStart = null, initialEnd = null }: Props) {
  const [start, setStart] = useState<string | null>(initialStart ?? null);
  const [end, setEnd] = useState<string | null>(initialEnd ?? null);
  const todayISO = new Date().toISOString().slice(0,10);

  const onDayPress = (day: DateData) => {
    const d = day.dateString; // YYYY-MM-DD
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
      return;
    }
    if (d < start) {
      setStart(d);
      setEnd(null);
      return;
    }
    setEnd(d);
  };

  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    if (start && !end) {
      m[start] = { startingDay: true, endingDay: true, color: "#22C55E", textColor: "white" };
      return m;
    }
    if (start && end) {
      // build inclusive range
      const a = new Date(start);
      const b = new Date(end);
      for (let dt = new Date(a); dt <= b; dt.setDate(dt.getDate() + 1)) {
        const iso = dt.toISOString().slice(0, 10);
        const isStart = iso === start;
        const isEnd = iso === end;
        m[iso] = {
          startingDay: isStart,
          endingDay: isEnd,
          color: "#22C55E",
          textColor: "white",
        };
      }
    }
    return m;
  }, [start, end]);

  const canSave = !!start && !!end;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={styles.headerBtn}>Cancel</Text></Pressable>
            <Text style={styles.title}>{start && end ? formatRangeLabel(start, end) : "Select dates"}</Text>
            <Pressable
              onPress={() => canSave && onSave({ start: start!, end: end! })}
              hitSlop={8}
              disabled={!canSave}
            >
              <Text style={[styles.headerBtn, !canSave && { opacity: 0.4 }]}>Done</Text>
            </Pressable>
          </View>

          <Calendar
            onDayPress={onDayPress}
            markingType="period"
            markedDates={marked}
            enableSwipeMonths
            minDate={todayISO}
            theme={{
              todayTextColor: "#22C55E",
              selectedDayBackgroundColor: "#22C55E",
            }}
          />

          <View style={styles.footer}>
            <Pressable onPress={() => { setStart(null); setEnd(null); }} hitSlop={8}>
              <Text style={styles.clearLink}>Clear selection</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    paddingBottom: 16,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 16, fontWeight: "600" },
  headerBtn: { color: "#22C55E", fontWeight: "600", fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  clearLink: { color: "#6B7280", fontSize: 13 },
});
