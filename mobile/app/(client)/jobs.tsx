import { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert
} from "react-native";
import TopBar from "@src/components/TopBar";
import {
  listClientWorkOrders,
  createWorkOrder,
  type WorkOrder,
  type CreateWorkOrderInput
} from "@src/lib/api";
import { useAuth } from "@src/store/useAuth";
import DateRangeSheet from "@src/components/DateRangeSheet";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@src/theme/tokens";

export default function ClientJobs() {
  const { user, token } = useAuth();
  const clientId = user?.id;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  // form state
  const [orderTitle, setOrderTitle] = useState("");
  const [orderProperty, setOrderProperty] = useState("");
  const [orderLocation, setOrderLocation] = useState("");
  const [orderBudget, setOrderBudget] = useState("");
  const [orderDescription, setOrderDescription] = useState("");
  const [orderPrivate, setOrderPrivate] = useState(false);

  // dates
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [orderStart, setOrderStart] = useState("");
  const [orderEnd, setOrderEnd] = useState("");

  const refresh = useCallback(async () => {
    const mine = await listClientWorkOrders(clientId);
    setWorkOrders(mine);
  }, [clientId]);
  useEffect(() => { refresh(); }, [refresh]);

  const resetForm = () => {
    setOrderTitle("");
    setOrderProperty("");
    setOrderLocation("");
    setOrderBudget("");
    setOrderDescription("");
    setOrderPrivate(false);
    setOrderStart("");
    setOrderEnd("");
  };

  const submit = async () => {
    if (!orderTitle || !orderProperty || !orderStart || !orderEnd) {
      Alert.alert("Missing fields", "Please complete the form.");
      return;
    }
    const input: CreateWorkOrderInput = {
      title: orderTitle,
      property: orderProperty,
      start: orderStart,
      end: orderEnd,
      location: orderLocation,
      budget: orderBudget || undefined,
      description: orderDescription || undefined,
      isPrivate: orderPrivate,
    };
    try {
      await createWorkOrder(input, token || undefined, clientId);
      Alert.alert("Created", "Your work order is now live.");
      setFormOpen(false);
      resetForm();
      await refresh();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create work order");
    }
  };

  const renderItem = ({ item }: { item: WorkOrder }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderTitle}>{item.title}</Text>
      <Text style={styles.orderWhen}>{item.when}</Text>
      {item.budget ? <Text style={styles.orderBudget}>{item.budget}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <Pressable onPress={() => setFormOpen(true)} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={{ padding:12 }}
        data={workOrders}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height:12 }} />}
      />

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={{ padding:16 }}>
            <Text style={styles.modalTitle}>New Work Order</Text>
            <TextInput
              placeholder="Work order title"
              value={orderTitle}
              onChangeText={setOrderTitle}
              style={styles.input}
            />
            <TextInput
              placeholder="Property or site"
              value={orderProperty}
              onChangeText={setOrderProperty}
              style={styles.input}
            />
            <TextInput
              placeholder="Location"
              value={orderLocation}
              onChangeText={setOrderLocation}
              style={styles.input}
            />
            <Pressable onPress={() => setDateSheetOpen(true)} style={styles.dateRow}>
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>
                {orderStart && orderEnd ? `${orderStart} - ${orderEnd}` : "Select dates"}
              </Text>
            </Pressable>
            <TextInput
              placeholder="Budget (e.g. £5000)"
              value={orderBudget}
              onChangeText={setOrderBudget}
              style={styles.input}
            />
            <TextInput
              placeholder="Description"
              value={orderDescription}
              onChangeText={setOrderDescription}
              style={[styles.input, { height:80 }]} 
              multiline
            />
            <Pressable onPress={() => setOrderPrivate(p => !p)} style={styles.privateRow}>
              <Ionicons
                name={orderPrivate ? "checkbox" : "square-outline"}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.privateLabel}>Private work order</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.modalButtons}>
            <Pressable onPress={() => { setFormOpen(false); resetForm(); }} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.submitBtn}>
              <Text style={styles.submitText}>Publish</Text>
            </Pressable>
          </View>
        </View>
        <DateRangeSheet
          open={dateSheetOpen}
          onClose={() => setDateSheetOpen(false)}
          onSelect={(s, e) => { setOrderStart(s); setOrderEnd(e); }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: "#fff" },
  headerRow: { paddingHorizontal:12, paddingTop:6, paddingBottom:10, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  headerTitle: { fontWeight:"800", fontSize:18, color:"#1F2937" },
  addBtn: { padding:4 },
  orderCard: { padding:12, borderWidth:1, borderColor: Colors.border, borderRadius:8, backgroundColor:"#fff" },
  orderTitle: { fontWeight:"700", fontSize:16, color: Colors.text },
  orderWhen: { marginTop:4, color: Colors.muted },
  orderBudget: { marginTop:4, color: Colors.text },
  modalContainer: { flex:1, backgroundColor:"#fff" },
  modalTitle: { fontSize:18, fontWeight:"700", marginBottom:12 },
  input: { borderWidth:1, borderColor: Colors.border, borderRadius:6, padding:8, marginTop:8 },
  dateRow: { flexDirection:"row", alignItems:"center", marginTop:8 },
  dateText: { marginLeft:8, color: Colors.text },
  privateRow: { flexDirection:"row", alignItems:"center", marginTop:12 },
  privateLabel: { marginLeft:8, color: Colors.text },
  modalButtons: { flexDirection:"row", justifyContent:"space-between", padding:16, borderTopWidth:1, borderColor: Colors.border },
  cancelBtn: { padding:12 },
  cancelText: { color: Colors.muted, fontSize:16 },
  submitBtn: { backgroundColor: Colors.primary, padding:12, borderRadius:6 },
  submitText: { color:"#fff", fontWeight:"600", fontSize:16 },
});
