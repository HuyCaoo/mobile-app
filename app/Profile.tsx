import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapPickerModal from "../components/MapPickerModal";
import { API_BASE_URL } from "../constants/config";

export default function Profile() {
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [tempAddress, setTempAddress] = useState("");

  // --- Load user từ AsyncStorage (GIỮ NGUYÊN LOGIC) ---
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          const parsed = JSON.parse(data);
          setUser(parsed);
          setFullName(parsed.full_name || parsed.name || "");
          setEmail(parsed.email || "");
          setPhone(parsed.phone || "");
          setAddress(parsed.address || "");
          // Khôi phục coordinates nếu có
          if (parsed.latitude && parsed.longitude) {
            setSelectedCoordinates({
              latitude: parsed.latitude,
              longitude: parsed.longitude
            });
          }
        }
      } catch (err) {
        console.error("Lỗi đọc user:", err);
      }
    };
    loadUser();
  }, []);

  // Kiểm tra có thay đổi nào không
  useEffect(() => {
    if (user) {
      const originalFullName = user.full_name || user.name || "";
      const originalPhone = user.phone || "";
      const originalAddress = user.address || "";
      
      setHasChanges(
        fullName !== originalFullName ||
        phone !== originalPhone ||
        address !== originalAddress
      );
    }
  }, [fullName, phone, address, user]);

  // Handle address selection from map
  const handleAddressSelect = (selectedAddress: string, coordinates: { latitude: number; longitude: number }) => {
    setAddress(selectedAddress);
    setSelectedCoordinates(coordinates);
  };

  // Handle manual address input
  const handleManualAddressInput = () => {
    setTempAddress(address);
    setShowManualInput(true);
  };

  const confirmManualAddress = () => {
    if (tempAddress.trim()) {
      setAddress(tempAddress.trim());
      setSelectedCoordinates(null);
      setShowManualInput(false);
    }
  };

  // --- Cập nhật thông tin (GIỮ NGUYÊN 100% LOGIC API) ---
  const handleUpdate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updateData = {
        full_name: fullName,
        phone,
        address,
        // Chỉ gửi coordinates nếu database có hỗ trợ
        // latitude: selectedCoordinates?.latitude || null,
        // longitude: selectedCoordinates?.longitude || null,
      };

      const res = await fetch(`${API_BASE_URL}/users/${user.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Lỗi khi cập nhật thông tin");

      // Lưu lại user mới vào AsyncStorage (bao gồm coordinates)
      const updatedUser = { 
        ...user, 
        full_name: fullName, 
        phone, 
        address,
        latitude: selectedCoordinates?.latitude || null,
        longitude: selectedCoordinates?.longitude || null,
      };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert("✅ Thành công", "Thông tin đã được cập nhật!");
      setHasChanges(false);
    } catch (err: any) {
      Alert.alert("❌ Lỗi", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation cho phone
  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải thông tin người dùng...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông Tin Cá Nhân</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Avatar & Basic Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#007AFF" />
            </View>
            <View style={styles.changeAvatarButton}>
              <Ionicons name="camera" size={16} color="#007AFF" />
            </View>
          </View>
          <View style={styles.basicInfo}>
            <Text style={styles.displayName}>{String(fullName || "Người dùng")}</Text>
            <Text style={styles.displayEmail}>{String(email || "")}</Text>
            {hasChanges && (
              <View style={styles.changesBadge}>
                <Ionicons name="sync" size={12} color="#ff8800" />
                <Text style={styles.changesText}>Có thay đổi</Text>
              </View>
            )}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Họ tên */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="person-outline" size={16} color="#666" /> Họ và tên
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#999"
              />
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
          </View>

          {/* Email (readonly) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="mail-outline" size={16} color="#666" /> Email
            </Text>
            <View style={[styles.inputContainer, styles.readonlyContainer]}>
              <TextInput
                style={[styles.input, styles.readonly]}
                value={email}
                editable={false}
                placeholder="Email chưa được thiết lập"
                placeholderTextColor="#999"
              />
              <Ionicons name="lock-closed" size={20} color="#ccc" />
            </View>
            <Text style={styles.helperText}>
              <Ionicons name="information-circle" size={14} color="#007AFF" />
              {" "}Email không thể thay đổi
            </Text>
          </View>

          {/* Số điện thoại */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="call-outline" size={16} color="#666" /> Số điện thoại
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Nhập số điện thoại"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
            {phone && !isValidPhone(phone) && (
              <Text style={styles.errorText}>
                <Ionicons name="warning" size={14} color="#ff4444" /> Số điện thoại không hợp lệ
              </Text>
            )}
          </View>

          {/* Địa chỉ với Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="location-outline" size={16} color="#666" /> Địa chỉ
            </Text>
            <TouchableOpacity 
              style={styles.mapInputContainer}
              onPress={() => setShowMapPicker(true)}
            >
              <View style={styles.mapInputContent}>
                <Text style={[
                  styles.mapInputText,
                  !address && styles.mapInputPlaceholder
                ]}>
                  {address || "Chạm để chọn địa chỉ trên bản đồ"}
                </Text>
                <View style={styles.mapInputIcons}>
                  {selectedCoordinates && (
                    <View style={styles.locationIndicator}>
                      <Ionicons name="location" size={16} color="#00aa00" />
                    </View>
                  )}
                  <Ionicons name="map-outline" size={20} color="#007AFF" />
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Manual address input option */}
            <TouchableOpacity 
              style={styles.manualInputToggle}
              onPress={handleManualAddressInput}
            >
              <Ionicons name="create-outline" size={16} color="#666" />
              <Text style={styles.manualInputText}>Hoặc nhập thủ công</Text>
            </TouchableOpacity>
          </View>

          {/* Update Button */}
          <TouchableOpacity 
            style={[
              styles.updateButton,
              (!hasChanges || (phone && !isValidPhone(phone))) && styles.updateButtonDisabled
            ]}
            onPress={isLoading || !hasChanges || (phone && !isValidPhone(phone)) ? undefined : handleUpdate}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.updateButtonText}>
                  {hasChanges ? "Lưu Thay Đổi" : "Đã Cập Nhật"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Account Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.statLabel}>Tham gia</Text>
              <Text style={styles.statValue}>Thành viên</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#00aa00" />
              <Text style={styles.statLabel}>Trạng thái</Text>
              <Text style={styles.statValue}>Đã xác thực</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="star-outline" size={20} color="#ff8800" />
              <Text style={styles.statLabel}>Đánh giá</Text>
              <Text style={styles.statValue}>5.0★</Text>
            </View>
          </View>

          {/* Helper Info */}
          <View style={styles.helperCard}>
            <Ionicons name="bulb-outline" size={16} color="#007AFF" />
            <Text style={styles.helperCardText}>
              Thông tin cá nhân giúp chúng tôi cung cấp dịch vụ tốt hơn cho bạn. 
              Chỉ bạn mới có thể chỉnh sửa thông tin này.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Manual Address Input Modal */}
      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.manualInputModal}>
            <View style={styles.manualInputHeader}>
              <Text style={styles.manualInputTitle}>Nhập địa chỉ thủ công</Text>
              <TouchableOpacity 
                onPress={() => setShowManualInput(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.manualInputDescription}>
              Bạn có thể nhập địa chỉ thủ công nếu không muốn sử dụng bản đồ:
            </Text>
            
            <TextInput
              style={styles.manualInputField}
              value={tempAddress}
              onChangeText={setTempAddress}
              placeholder="Nhập địa chỉ của bạn..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            
            <View style={styles.manualInputActions}>
              <TouchableOpacity 
                style={styles.manualInputCancelButton}
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.manualInputCancelText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.manualInputConfirmButton,
                  !tempAddress.trim() && styles.manualInputConfirmButtonDisabled
                ]}
                onPress={confirmManualAddress}
                disabled={!tempAddress.trim()}
              >
                <Text style={styles.manualInputConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectAddress={handleAddressSelect}
        initialAddress={address}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  changeAvatarButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  basicInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  displayEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  changesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  changesText: {
    fontSize: 12,
    color: "#ff8800",
    marginLeft: 4,
    fontWeight: "500",
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    paddingRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  readonlyContainer: {
    backgroundColor: "#f8f9fa",
    borderColor: "#e9ecef",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  readonly: {
    color: "#6c757d",
    backgroundColor: "transparent",
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  addressIcon: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
  // Map picker styles (từ RegisterWeb)
  mapInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e8ed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mapInputContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  mapInputText: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    lineHeight: 22,
  },
  mapInputPlaceholder: {
    color: "#999",
  },
  mapInputIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIndicator: {
    marginRight: 8,
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  manualInputToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
  },
  manualInputText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
    textDecorationLine: "underline",
  },
  helperText: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#ff4444",
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  updateButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e1e8ed",
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 2,
  },
  helperCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  helperCardText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 8,
    lineHeight: 20,
  },
  // Modal styles (từ RegisterWeb)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  manualInputModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  manualInputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  manualInputDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  manualInputField: {
    borderWidth: 1,
    borderColor: "#e1e8ed",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1a1a1a",
    minHeight: 80,
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
  },
  manualInputActions: {
    flexDirection: "row",
    gap: 12,
  },
  manualInputCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  manualInputConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputConfirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  manualInputConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});