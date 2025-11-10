import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../constants/config";

export default function ChangePassword() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- Load user từ AsyncStorage (GIỮ NGUYÊN LOGIC) ---
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("user");
        if (data) {
          setUser(JSON.parse(data));
        }
      } catch (err) {
        console.error("Lỗi đọc user:", err);
      }
    };
    loadUser();
  }, []);

  // --- GIỮ NGUYÊN 100% LOGIC API ---
  const handleChangePassword = async () => {
    if (!user) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("⚠️ Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("⚠️ Lỗi", "Mật khẩu mới và xác nhận không khớp");
      return;
    }
    if (oldPassword !== user.password_hash) {
      Alert.alert("⚠️ Lỗi", "Mật khẩu cũ không đúng");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...user,
          password_hash: newPassword,
        }),
      });

      if (!res.ok) throw new Error("Đổi mật khẩu thất bại");

      Alert.alert("✅ Thành công", "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại!");

      // 👉 Xóa user khỏi AsyncStorage để bắt đăng nhập lại
      await AsyncStorage.removeItem("user");

      // Reset về màn login
      router.replace("/user");
    } catch (err: any) {
      Alert.alert("❌ Lỗi", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Kiểm tra độ mạnh mật khẩu
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { text: "Yếu", color: "#ff4444" };
    if (password.length < 8) return { text: "Trung bình", color: "#ffaa00" };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { text: "Mạnh", color: "#00aa00" };
    }
    return { text: "Khá", color: "#3399ff" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải thông tin người dùng...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi Mật Khẩu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.userIcon}>
          <Ionicons name="person" size={24} color="#007AFF" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{String(user?.full_name || "Người dùng")}</Text>
          <Text style={styles.userEmail}>{String(user?.email || "")}</Text>
        </View>
        <View style={styles.securityIcon}>
          <Ionicons name="shield-checkmark" size={20} color="#00aa00" />
        </View>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Mật khẩu cũ */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="lock-closed" size={16} color="#666" /> Mật khẩu hiện tại
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowOldPassword(!showOldPassword)}
            >
              <Ionicons 
                name={showOldPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mật khẩu mới */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="key" size={16} color="#666" /> Mật khẩu mới
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons 
                name={showNewPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          {newPassword ? (
            <View style={styles.strengthContainer}>
              <View style={[styles.strengthIndicator, { backgroundColor: passwordStrength.color }]} />
              <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                Độ mạnh: {passwordStrength.text}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Xác nhận mật khẩu */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="checkmark-circle" size={16} color="#666" /> Xác nhận mật khẩu
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          {confirmPassword && newPassword !== confirmPassword ? (
            <Text style={styles.errorText}>
              <Ionicons name="warning" size={14} color="#ff4444" /> Mật khẩu không khớp
            </Text>
          ) : confirmPassword && newPassword === confirmPassword ? (
            <Text style={styles.successText}>
              <Ionicons name="checkmark" size={14} color="#00aa00" /> Mật khẩu khớp
            </Text>
          ) : null}
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
          <View style={styles.requirement}>
            <Ionicons 
              name={newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={newPassword.length >= 6 ? "#00aa00" : "#ccc"} 
            />
            <Text style={[styles.requirementText, { 
              color: newPassword.length >= 6 ? "#00aa00" : "#666" 
            }]}>
              Ít nhất 6 ký tự
            </Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={newPassword.length >= 8 ? "#00aa00" : "#ccc"} 
            />
            <Text style={[styles.requirementText, { 
              color: newPassword.length >= 8 ? "#00aa00" : "#666" 
            }]}>
              Khuyến nghị: Từ 8 ký tự trở lên
            </Text>
          </View>
        </View>

        {/* Update Button */}
        <TouchableOpacity 
          style={[
            styles.updateButton,
            (!oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword) && 
            styles.updateButtonDisabled
          ]}
          onPress={isLoading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword ? undefined : handleChangePassword}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>Cập Nhật Mật Khẩu</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="information-circle" size={16} color="#007AFF" />
          <Text style={styles.securityNoteText}>
            Sau khi đổi mật khẩu, bạn sẽ được yêu cầu đăng nhập lại để đảm bảo bảo mật.
          </Text>
        </View>
      </View>
    </ScrollView>
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fff4",
    justifyContent: "center",
    alignItems: "center",
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
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  eyeButton: {
    padding: 14,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  strengthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#ff4444",
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  successText: {
    fontSize: 14,
    color: "#00aa00",
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  requirementsCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  securityNoteText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 8,
    lineHeight: 20,
  },
});