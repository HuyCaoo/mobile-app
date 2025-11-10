import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
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

export default function RegisterWeb() {
  const navigation: any = useNavigation();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [tempAddress, setTempAddress] = useState("");

  // Validation functions
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { text: "Yếu", color: "#ff4444" };
    if (password.length < 8) return { text: "Trung bình", color: "#ffaa00" };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { text: "Mạnh", color: "#00aa00" };
    }
    return { text: "Khá", color: "#3399ff" };
  };

  const passwordStrength = getPasswordStrength(password);

  // Kiểm tra form hợp lệ
  const isFormValid = () => {
    return (
      fullName.trim() !== "" &&
      isValidEmail(email) &&
      password.length >= 6 &&
      password === confirmPassword &&
      phone.trim() !== "" &&
      isValidPhone(phone) &&
      address.trim() !== ""
    );
  };

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

  // --- LOGIC API TƯƠNG TỰ CHANGEPASSWORD VÀ PROFILE ---
  const handleRegister = async () => {
    if (!isFormValid()) {
      Alert.alert("⚠️ Lỗi", "Vui lòng kiểm tra và điền đầy đủ thông tin hợp lệ");
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Kiểm tra email đã tồn tại chưa
      console.log("🔍 Checking if email exists...");
      const checkResponse = await fetch(`${API_BASE_URL}/users`);
      
      if (!checkResponse.ok) {
        throw new Error("Không thể kiểm tra email");
      }
      
      const existingUsers = await checkResponse.json();
      const emailExists = existingUsers.some((user: any) => user.email === email);
      
      if (emailExists) {
        Alert.alert("⚠️ Lỗi", "Email này đã được sử dụng. Vui lòng chọn email khác.");
        return;
      }

      // 2. Tạo user mới
      console.log("📝 Creating new user...");
      const newUser = {
        full_name: fullName,
        email: email,
        password_hash: password,
        phone: phone,
        address: address,
        // Bỏ created_at - để database tự set với CURRENT_TIMESTAMP
      };

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      console.log("📡 API Response Status:", response.status);
      
      if (!response.ok) {
        // Chỉ đọc response text khi có lỗi
        const responseText = await response.text();
        console.log("📡 API Error Text:", responseText);
        
        // Xử lý các loại lỗi khác nhau
        let errorMessage = "Có lỗi xảy ra khi đăng ký";
        if (response.status === 500) {
          errorMessage = "Server đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
        } else if (response.status === 400) {
          errorMessage = "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.";
        } else if (response.status === 409) {
          errorMessage = "Email hoặc số điện thoại đã được sử dụng.";
        }
        
        throw new Error(errorMessage);
      }

      // Nếu thành công, đọc JSON
      const result = await response.json();
      console.log("✅ Registration successful:", result);

      Alert.alert(
        "✅ Thành công", 
        "Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error: any) {
      console.error("❌ Registration error:", error);
      
      let userMessage = "Có lỗi xảy ra khi đăng ký";
      
      if (error.message.includes('fetch')) {
        userMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.";
      } else if (error.message) {
        userMessage = error.message;
      }
      
      Alert.alert("❌ Lỗi Đăng Ký", userMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Đăng Ký Tài Khoản</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="person-add" size={32} color="#007AFF" />
          </View>
          <Text style={styles.welcomeTitle}>Tạo tài khoản mới</Text>
          <Text style={styles.welcomeSubtitle}>
            Điền thông tin bên dưới để tạo tài khoản của bạn
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Họ tên */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="person-outline" size={16} color="#666" /> Họ và tên *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên của bạn"
                placeholderTextColor="#999"
              />
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="mail-outline" size={16} color="#666" /> Email *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@gmail.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
            {email && !isValidEmail(email) && (
              <Text style={styles.errorText}>
                <Ionicons name="warning" size={14} color="#ff4444" /> Email không hợp lệ
              </Text>
            )}
          </View>

          {/* Mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="lock-closed-outline" size={16} color="#666" /> Mật khẩu *
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            {password ? (
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
              <Ionicons name="checkmark-circle-outline" size={16} color="#666" /> Xác nhận mật khẩu *
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu"
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
            {confirmPassword && password !== confirmPassword ? (
              <Text style={styles.errorText}>
                <Ionicons name="warning" size={14} color="#ff4444" /> Mật khẩu không khớp
              </Text>
            ) : confirmPassword && password === confirmPassword ? (
              <Text style={styles.successText}>
                <Ionicons name="checkmark" size={14} color="#00aa00" /> Mật khẩu khớp
              </Text>
            ) : null}
          </View>

          {/* Số điện thoại */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="call-outline" size={16} color="#666" /> Số điện thoại *
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0987654321"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
            {phone && !isValidPhone(phone) && (
              <Text style={styles.errorText}>
                <Ionicons name="warning" size={14} color="#ff4444" /> Số điện thoại không hợp lệ (10-11 số)
              </Text>
            )}
          </View>

          {/* Địa chỉ với Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="location-outline" size={16} color="#666" /> Địa chỉ *
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

          {/* Password Requirements */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
            <View style={styles.requirement}>
              <Ionicons 
                name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={password.length >= 6 ? "#00aa00" : "#ccc"} 
              />
              <Text style={[styles.requirementText, { 
                color: password.length >= 6 ? "#00aa00" : "#666" 
              }]}>
                Ít nhất 6 ký tự
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons 
                name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={password.length >= 8 ? "#00aa00" : "#ccc"} 
              />
              <Text style={[styles.requirementText, { 
                color: password.length >= 8 ? "#00aa00" : "#666" 
              }]}>
                Khuyến nghị: Từ 8 ký tự trở lên
              </Text>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            style={[
              styles.registerButton,
              !isFormValid() && styles.registerButtonDisabled
            ]}
            onPress={!isFormValid() ? undefined : handleRegister}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.registerButtonText}>Tạo Tài Khoản</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={16} color="#007AFF" />
            <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Bằng việc tạo tài khoản, bạn đồng ý với{" "}
              <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{" "}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của chúng tôi.
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
  welcomeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  addressIcon: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
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
  registerButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  backToLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 20,
  },
  backToLoginText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  termsContainer: {
    marginTop: 20,
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "#007AFF",
    fontWeight: "500",
  },
  // Modal styles
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