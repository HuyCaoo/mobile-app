'use client';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchData } from "../constants/api";

export default function ArtistsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState("Người dùng");

  useEffect(() => {
    loadUser();
    handleFetch();
    loadCartCount();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserName(parsed.full_name || "Người dùng");
      }
    } catch (err) {
      console.error("❌ Lỗi load user:", err);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchData("/artists");
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("❌ Lỗi khi fetch:", err);
      setError("Không thể tải dữ liệu từ server.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const savedCart = await AsyncStorage.getItem("cart");
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      setCartCount(parsed.length);
    } catch (err) {
      console.error("❌ Lỗi load giỏ:", err);
      setCartCount(0);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.artistCard}>
      <View style={styles.artistHeader}>
        <View style={styles.artistAvatar}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{item.name}</Text>
          <Text style={styles.artistId}>ID: {item.artist_id}</Text>
        </View>
      </View>
      
      {item.bio && (
        <View style={styles.bioSection}>
          <Text style={styles.bioLabel}>Tiểu sử</Text>
          <Text style={styles.bioText}>{item.bio}</Text>
        </View>
      )}
      
      <View style={styles.contactSection}>
        <View style={styles.contactRow}>
          <Ionicons name="mail" size={16} color="#6366F1" />
          <Text style={styles.contactText}>{item.email || "Chưa có email"}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call" size={16} color="#6366F1" />
          <Text style={styles.contactText}>{item.phone || "Chưa có SĐT"}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="calendar" size={16} color="#6366F1" />
          <Text style={styles.contactText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString("vi-VN")
              : "Không rõ"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Welcome Bar */}
      <View style={styles.welcomeBar}>
        <View style={styles.welcomeContent}>
          <Ionicons name="color-palette" size={24} color="#6366F1" />
          <Text style={styles.welcomeText}>Xin chào, {userName}!</Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Họa sĩ nổi tiếng</Text>
          <Text style={styles.headerSubtitle}>
            {data.length > 0 ? `${data.length} họa sĩ` : "Đang tải..."}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.cartButton} 
          onPress={() => router.push("/Cart")}
        >
          <Ionicons name="bag" size={24} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Đang tải danh sách họa sĩ...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Oops! Có lỗi xảy ra</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleFetch}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && data.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Chưa có họa sĩ nào</Text>
            <Text style={styles.emptyText}>Danh sách họa sĩ đang được cập nhật</Text>
          </View>
        )}

        {!loading && !error && data.length > 0 && (
          <FlatList
            data={data}
            keyExtractor={(item: any, index: number) =>
              item.artist_id ? item.artist_id.toString() : index.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => router.replace("/tranh")}
        >
          <Ionicons name="image" size={24} color="#9CA3AF" />
          <Text style={styles.tabTextInactive}>Tranh</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => router.replace("/artists")}
        >
          <Ionicons name="color-palette" size={24} color="#6366F1" />
          <Text style={styles.tabTextActive}>Họa sĩ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => router.replace("/MyOrdersScreen")}
        >
          <Ionicons name="receipt" size={24} color="#9CA3AF" />
          <Text style={styles.tabTextInactive}>Đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem} 
          onPress={() => router.replace("/user")}
        >
          <Ionicons name="person-circle" size={24} color="#9CA3AF" />
          <Text style={styles.tabTextInactive}>Cá nhân</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Welcome Bar
  welcomeBar: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 12,
  },
  
  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  cartButton: {
    backgroundColor: "#6366F1",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  
  // List
  listContainer: {
    paddingBottom: 20,
  },
  
  // Artist Card
  artistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  artistHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  artistId: {
    fontSize: 14,
    color: "#6B7280",
  },
  bioSection: {
    marginBottom: 16,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
    flex: 1,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabTextActive: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    marginTop: 4,
  },
  tabTextInactive: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 4,
  },
});