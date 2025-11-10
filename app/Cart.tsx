'use client';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const storedCart = await AsyncStorage.getItem("cart");
      const parsed = storedCart ? JSON.parse(storedCart) : [];
      setCart(parsed);
    } catch (err) {
      console.error("❌ Lỗi load giỏ:", err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (variantId: number) => {
    try {
      const updatedCart = cart.filter((item) => item.variant_id !== variantId);
      setCart(updatedCart);
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
    } catch (err) {
      console.error("❌ Lỗi xóa item:", err);
    }
  };

  const updateQuantity = async (variantId: number, delta: number) => {
    try {
      const updatedCart = cart.map((item) => {
        if (item.variant_id === variantId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
      setCart(updatedCart);
      await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
    } catch (err) {
      console.error("❌ Lỗi cập nhật số lượng:", err);
    }
  };

  const totalPrice = cart.reduce(
    (sum, i) => sum + Number(i.price || 0) * (i.quantity || 1),
    0
  );

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert("🛒 Giỏ hàng trống", "Vui lòng thêm sản phẩm trước khi thanh toán!");
      return;
    }
    router.push("/CheckoutScreen");
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="bag-outline" size={80} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
      <Text style={styles.emptySubtitle}>
        Hãy khám phá bộ sưu tập tranh tuyệt đẹp của chúng tôi
      </Text>
      <TouchableOpacity 
        style={styles.shopNowButton}
        onPress={() => router.replace("/tranh")}
      >
        <Text style={styles.shopNowText}>🎨 Mua sắm ngay</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛒 Giỏ hàng</Text>
        <View style={styles.headerRight}>
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      ) : cart.length === 0 ? (
        renderEmptyCart()
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(item, i) => item.variant_id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <View style={styles.imageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                  </View>
                )}
              </View>

              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                
                <View style={styles.itemInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{item.artist_name || "Không rõ"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="resize-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{item.size || "N/A"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="layers-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{item.material || "Không rõ"}</Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>
                    {Number(item.price).toLocaleString()}₫
                  </Text>
                  <Text style={styles.subtotalPrice}>
                    = {(item.price * item.quantity).toLocaleString()}₫
                  </Text>
                </View>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.variant_id, -1)}
                  >
                    <Ionicons name="remove" size={18} color="#6366F1" />
                  </TouchableOpacity>
                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.variant_id, 1)}
                  >
                    <Ionicons name="add" size={18} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item.variant_id)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Checkout Bottom Bar */}
      {cart.length > 0 && (
        <View style={styles.checkoutContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalPrice}>{totalPrice.toLocaleString()}₫</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Ionicons name="card-outline" size={20} color="#FFFFFF" style={styles.checkoutIcon} />
            <Text style={styles.checkoutButtonText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      )}

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
          <View style={styles.tabIconContainer}>
            <Ionicons name="person-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Tài khoản</Text>
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

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
    alignItems: "center",
  },
  cartBadge: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Empty Cart Styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  shopNowButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shopNowText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // List Styles
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 160,
  },

  // Cart Item Styles
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    marginRight: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 22,
  },
  itemInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0284C7",
  },
  subtotalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  quantityDisplay: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // Checkout Styles
  checkoutContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  checkoutButton: {
    flexDirection: "row",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutIcon: {
    marginRight: 8,
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
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
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
});