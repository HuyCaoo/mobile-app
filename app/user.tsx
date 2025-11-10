'use client';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchData } from "../constants/api.js";

export default function UserScreen() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Load user từ AsyncStorage khi mở app
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("❌ Lỗi load user:", err);
      }
    };
    loadUser();
  }, []);

  // --- Xử lý login ---
  const handleLogin = async () => {
    const emailValue = String(email || "").trim();
    const passwordValue = String(password || "").trim();
    
    if (!emailValue || !passwordValue) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      const users = await fetchData("/users");
      const found = users.find(
        (u: any) => u.email === emailValue && u.password_hash === passwordValue
      );
      if (!found) {
        Alert.alert("Đăng nhập thất bại", "Email hoặc mật khẩu không đúng");
        return;
      }
      setUser(found);
      setIsLoggedIn(true);
      await AsyncStorage.setItem("user", JSON.stringify(found)); // ✅ lưu vào bộ nhớ
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể đăng nhập: " + String(err?.message || "Lỗi không xác định"));
    }
  };

  // --- Xử lý logout (xoá toàn bộ AsyncStorage) ---
  const handleLogout = async () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc muốn đăng xuất?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoggedIn(false);
              setUser(null);
              setEmail("");
              setPassword("");
              await AsyncStorage.clear(); // ✅ xoá toàn bộ dữ liệu (user, cart, token, v.v.)
            } catch (err) {
              console.error("❌ Lỗi khi logout:", err);
            }
          }
        }
      ]
    );
  };

  // --- Chưa đăng nhập ---
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.loginHeader}>
          <View style={styles.logoContainer}>
            <Ionicons name="person-circle" size={80} color="#6366F1" />
          </View>
          <Text style={styles.welcomeTitle}>Chào mừng bạn!</Text>
          <Text style={styles.welcomeSubtitle}>Đăng nhập để tiếp tục</Text>
        </View>

        {/* Login Form */}
        <View style={styles.loginForm}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Nhập email của bạn"
              placeholderTextColor="#9CA3AF"
              value={String(email || "")}
              onChangeText={(text) => setEmail(String(text || ""))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={String(password || "")}
              onChangeText={(text) => setPassword(String(text || ""))}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => router.push("/RegisterWeb")}
          >
            <Ionicons name="person-add-outline" size={20} color="#6366F1" style={styles.registerIcon} />
            <Text style={styles.registerButtonText}>Tạo tài khoản mới</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => router.replace("/tranh")}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons name="image-outline" size={22} color="#9CA3AF" />
            </View>
            <Text style={styles.tabText}>Tranh</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => router.replace("/artists")}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons name="color-palette-outline" size={22} color="#9CA3AF" />
            </View>
            <Text style={styles.tabText}>Họa sĩ</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => router.replace("/MyOrdersScreen")}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons name="receipt-outline" size={22} color="#9CA3AF" />
            </View>
            <Text style={styles.tabText}>Đơn hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => router.replace("/user")}
          >
            <View style={[styles.tabIconContainer, styles.activeTab]}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.tabText, styles.activeTabText]}>Tài khoản</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Đã đăng nhập ---
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải thông tin người dùng...</Text>
        </View>
      </View>
    );
  }

  const menu = [
    { 
      id: "1", 
      title: "Cập nhật thông tin", 
      icon: "person-outline",
      subtitle: "Chỉnh sửa thông tin cá nhân"
    },
    { 
      id: "2", 
      title: "Thay đổi mật khẩu", 
      icon: "lock-closed-outline",
      subtitle: "Bảo mật tài khoản của bạn"
    },
    { 
      id: "3", 
      title: "Ngôn ngữ", 
      icon: "language-outline",
      subtitle: "Tiếng Việt"
    },
    { 
      id: "4", 
      title: "Về ứng dụng", 
      icon: "information-circle-outline",
      subtitle: "Thông tin phiên bản"
    },
  ];

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user?.email ? `https://i.pravatar.cc/100?u=${String(user.email)}` : "https://i.pravatar.cc/100?u=default" }}
            style={styles.avatar}
          />
          {Boolean(user?.admin) && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={styles.username}>
          {Boolean(user?.admin) ? "Quản trị viên" : String(user?.full_name || "Người dùng")}
        </Text>
        <Text style={styles.userEmail}>{String(user?.email || "email@example.com")}</Text>
      </View>

      {/* Menu List */}
      <View style={styles.menuContainer}>
        <FlatList
          data={menu}
          keyExtractor={(item) => String(item.id || Math.random())}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const itemId = String(item.id || "");
                if (itemId === "1") router.push("/Profile");
                if (itemId === "2") router.push("/ChangePassword");
                if (itemId === "4") router.push("/AboutApp");
              }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={24} color="#6366F1" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{String(item.title || "")}</Text>
                <Text style={styles.menuSubtitle}>{String(item.subtitle || "")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuList}
        />
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0 - Art Gallery</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/tranh")}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons name="image-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Tranh</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/artists")}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons name="color-palette-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Họa sĩ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/MyOrdersScreen")}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons name="receipt-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/user")}
        >
          <View style={[styles.tabIconContainer, styles.activeTab]}>
            <Ionicons name="person" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.tabText, styles.activeTabText]}>Tài khoản</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Login State Styles
  loginHeader: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },

  loginForm: {
    paddingHorizontal: 20,
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
  },
  registerButton: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  registerIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    color: "#6366F1",
    fontSize: 16,
    fontWeight: "600",
  },

  // Profile State Styles
  profileHeader: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  adminBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#10B981",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#6B7280",
  },

  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuList: {
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  logoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FEE2E2",
    marginBottom: 20,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Tab Bar Styles
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  activeTab: {
    backgroundColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  activeTabText: {
    color: "#6366F1",
    fontWeight: "600",
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
});