import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [tempAddress, setTempAddress] = useState("");

  useEffect(() => {
    loadCart();
    loadUserInfo();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("cart");
      setCart(stored ? JSON.parse(stored) : []);
    } catch (err) {
      console.error("❌ Lỗi load giỏ hàng:", err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        setName(u.full_name || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setAddress(u.address || "");
        // Khôi phục coordinates nếu có
        if (u.latitude && u.longitude) {
          setSelectedCoordinates({
            latitude: u.latitude,
            longitude: u.longitude
          });
        }
      }
    } catch (err) {
      console.error("❌ Lỗi load user:", err);
    }
  };

  const total = cart.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
    0
  );

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

  // --- Gửi đơn hàng vào backend ---
  const sendOrderToServer = async () => {
    if (!user) {
      Alert.alert("⚠️ Lỗi", "Không tìm thấy thông tin người dùng!");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Gửi request tạo đơn hàng
      const orderPayload = {
        user_id: user.user_id,
        full_name: name,
        email,
        phone,
        address,
        note,
        total_price: total,
        status: "Pending",
        // Tùy chọn: thêm coordinates nếu database hỗ trợ
        // latitude: selectedCoordinates?.latitude || null,
        // longitude: selectedCoordinates?.longitude || null,
      };

      console.log("📦 Gửi order:", orderPayload);

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const text = await res.text();
      console.log("📩 Server trả về:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Phản hồi từ server không phải JSON hợp lệ!");
      }

      if (!res.ok) {
        throw new Error(data.message || "Không thể tạo hóa đơn!");
      }

      const orderId = data.order_id;
      console.log("✅ Order ID:", orderId);

      // 2️⃣ Gửi từng item vào bảng order_items
      let finalStatus: "Pending" | "Shipping" = "Shipping"; // mặc định là shipping

      for (const item of cart) {
        const variantId = item.variant_id ?? item.painting_variants_id ?? item.variants_id ?? null;
        let currentStock = 0;

        // 🧾 1) Lấy stock hiện tại
        if (variantId) {
          const getV = await fetch(`${API_BASE_URL}/painting_variants/${variantId}`);
          if (getV.ok) {
            const vData = await getV.json();
            currentStock = Number(vData.stock_quantity ?? 0);
          }
        }

        // 🧩 2) So sánh số lượng đặt
        const orderQty = Number(item.quantity ?? 0);
        let newStock = currentStock;
        if (orderQty > currentStock) {
          finalStatus = "Pending"; // có ít nhất 1 sản phẩm không đủ hàng
          newStock = 0;
        } else {
          newStock = currentStock - orderQty;
        }

        // 🧩 3) Gửi item
        const itemPayload = {
          order_id: orderId,
          painting_id: item.painting_id,
          painting_variants_id: variantId,
          quantity: orderQty,
          unit_price: item.price,
        };

        const itemRes = await fetch(`${API_BASE_URL}/order_details`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemPayload),
        });

        if (!itemRes.ok) {
          console.warn("⚠️ Không thể thêm item:", await itemRes.text());
        }

        // 🧮 4) Cập nhật stock
        if (variantId) {
          const updateRes = await fetch(`${API_BASE_URL}/painting_variants/${variantId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stock_quantity: newStock }),
          });

          if (updateRes.ok) {
            console.log(`✅ Stock variant ${variantId}: ${currentStock} → ${newStock}`);
          } else {
            console.warn("⚠️ Không thể cập nhật stock:", await updateRes.text());
          }
        }
      }

      // 5️⃣ Sau khi xử lý xong toàn bộ cart → cập nhật trạng thái đơn hàng
      await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: finalStatus }),
      });

      // 3️⃣ Xóa giỏ hàng
      await AsyncStorage.removeItem("cart");

      Alert.alert("✅ Thành công", `Đơn hàng #${orderId} đã được tạo!`);
      navigation.navigate("tranh" as never);
    } catch (err: any) {
      console.error("❌ Lỗi thanh toán:", err);
      Alert.alert("❌ Lỗi", err.message || "Không thể kết nối tới server!");
    } finally {
      setLoading(false);
    }
  };

  // --- Xác nhận trước khi gửi ---
  const handleConfirm = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert("⚠️ Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("🛒 Giỏ hàng trống", "Không có sản phẩm nào để thanh toán!");
      return;
    }

    setShowConfirmModal(true);
  };

  // Render cart item với design mới
  const renderCartItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{item.quantity}</Text>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title || "Sản phẩm không xác định"}
        </Text>
        <View style={styles.itemVariant}>
          <Ionicons name="resize" size={14} color="#6B7280" />
          <Text style={styles.variantText}>{item.size || "N/A"}</Text>
          <Ionicons name="color-palette" size={14} color="#6B7280" />
          <Text style={styles.variantText}>{item.material || "Không rõ"}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.unitPrice}>
            {Number(item.price || 0).toLocaleString("vi-VN")}₫ x {item.quantity}
          </Text>
          <Text style={styles.totalPrice}>
            {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString("vi-VN")}₫
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading && cart.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Thông tin giao hàng */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email (tùy chọn)"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Địa chỉ với Map Picker */}
          <View style={styles.addressInputGroup}>
            <TouchableOpacity 
              style={styles.mapInputContainer}
              onPress={() => setShowMapPicker(true)}
            >
              <View style={styles.mapInputContent}>
                <Ionicons name="home" size={20} color="#6B7280" style={styles.inputIcon} />
                <Text style={[
                  styles.mapInputText,
                  !address && styles.mapInputPlaceholder
                ]}>
                  {address || "Chạm để chọn địa chỉ trên bản đồ"}
                </Text>
                <View style={styles.mapInputIcons}>
                  {selectedCoordinates && (
                    <View style={styles.locationIndicator}>
                      <Ionicons name="location" size={16} color="#10B981" />
                    </View>
                  )}
                  <Ionicons name="map-outline" size={20} color="#6366F1" />
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Manual address input option */}
            <TouchableOpacity 
              style={styles.manualInputToggle}
              onPress={handleManualAddressInput}
            >
              <Ionicons name="create-outline" size={16} color="#6B7280" />
              <Text style={styles.manualInputText}>Hoặc nhập thủ công</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <Ionicons name="document-text" size={20} color="#6B7280" style={[styles.inputIcon, styles.textAreaIcon]} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ghi chú cho đơn hàng (tùy chọn)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        {/* Đơn hàng của bạn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bag" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Đơn hàng của bạn</Text>
            <View style={styles.itemCount}>
              <Text style={styles.itemCountText}>{cart.length}</Text>
            </View>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="bag-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyCartText}>Giỏ hàng trống</Text>
              <Text style={styles.emptyCartSubtext}>Thêm sản phẩm để tiếp tục thanh toán</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(item, index) => item.variant_id?.toString() || index.toString()}
                renderItem={renderCartItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              
              {/* Tổng tiền */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính</Text>
                  <Text style={styles.summaryValue}>
                    {total.toLocaleString("vi-VN")}₫
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                  <Text style={styles.freeShipping}>Miễn phí</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>
                    {total.toLocaleString("vi-VN")}₫
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {cart.length > 0 && (
        <View style={styles.bottomContainer}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomTotal}>
              Tổng: {total.toLocaleString("vi-VN")}₫
            </Text>
            <Text style={styles.itemsCount}>
              {cart.length} sản phẩm
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.checkoutButton, loading && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.checkoutButtonText}>Xác nhận thanh toán</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

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
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.manualInputDescription}>
              Bạn có thể nhập địa chỉ thủ công nếu không muốn sử dụng bản đồ:
            </Text>
            
            <TextInput
              style={styles.manualInputField}
              value={tempAddress}
              onChangeText={setTempAddress}
              placeholder="Nhập địa chỉ giao hàng..."
              placeholderTextColor="#9CA3AF"
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

      {/* Confirmation Modal */}
      <Modal 
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.confirmModalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="receipt" size={24} color="#6366F1" />
                </View>
                <Text style={styles.confirmModalTitle}>Xác nhận đơn hàng</Text>
                <TouchableOpacity 
                  style={styles.confirmModalCloseButton}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Shipping Info */}
              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Thông tin giao hàng</Text>
                <View style={styles.confirmInfoCard}>
                  <View style={styles.confirmInfoRow}>
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text style={styles.confirmInfoLabel}>Người nhận:</Text>
                    <Text style={styles.confirmInfoValue}>{name}</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Ionicons name="call" size={16} color="#6B7280" />
                    <Text style={styles.confirmInfoLabel}>Điện thoại:</Text>
                    <Text style={styles.confirmInfoValue}>{phone}</Text>
                  </View>
                  {email.trim() && (
                    <View style={styles.confirmInfoRow}>
                      <Ionicons name="mail" size={16} color="#6B7280" />
                      <Text style={styles.confirmInfoLabel}>Email:</Text>
                      <Text style={styles.confirmInfoValue}>{email}</Text>
                    </View>
                  )}
                  <View style={styles.confirmInfoRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.confirmInfoLabel}>Địa chỉ:</Text>
                    <Text style={styles.confirmInfoValue}>{address}</Text>
                  </View>
                  {selectedCoordinates && (
                    <View style={styles.confirmInfoRow}>
                      <Ionicons name="map" size={16} color="#10B981" />
                      <Text style={styles.confirmInfoLabel}>Tọa độ:</Text>
                      <Text style={styles.confirmInfoValue}>
                        {selectedCoordinates.latitude.toFixed(6)}, {selectedCoordinates.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                  {note.trim() && (
                    <View style={styles.confirmInfoRow}>
                      <Ionicons name="document-text" size={16} color="#6B7280" />
                      <Text style={styles.confirmInfoLabel}>Ghi chú:</Text>
                      <Text style={styles.confirmInfoValue}>{note}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Sản phẩm đặt mua</Text>
                <View style={styles.confirmItemsCard}>
                  {cart.map((item, index) => (
                    <View key={index} style={styles.confirmItem}>
                      <Image 
                        source={{ uri: item.image_url }} 
                        style={styles.confirmItemImage}
                      />
                      <View style={styles.confirmItemDetails}>
                        <Text style={styles.confirmItemTitle} numberOfLines={2}>
                          {item.title || "Sản phẩm không xác định"}
                        </Text>
                        <Text style={styles.confirmItemVariant}>
                          {item.size || "N/A"} • {item.material || "Không rõ"}
                        </Text>
                        <View style={styles.confirmItemPricing}>
                          <Text style={styles.confirmItemQuantity}>SL: {item.quantity}</Text>
                          <Text style={styles.confirmItemPrice}>
                            {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString("vi-VN")}₫
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Order Summary */}
              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Tóm tắt đơn hàng</Text>
                <View style={styles.confirmSummaryCard}>
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmSummaryLabel}>Số lượng sản phẩm:</Text>
                    <Text style={styles.confirmSummaryValue}>{cart.length} món</Text>
                  </View>
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmSummaryLabel}>Tạm tính:</Text>
                    <Text style={styles.confirmSummaryValue}>
                      {total.toLocaleString("vi-VN")}₫
                    </Text>
                  </View>
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmSummaryLabel}>Phí vận chuyển:</Text>
                    <Text style={styles.confirmFreeShipping}>Miễn phí</Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmSummaryRow}>
                    <Text style={styles.confirmTotalLabel}>Tổng thanh toán:</Text>
                    <Text style={styles.confirmTotalValue}>
                      {total.toLocaleString("vi-VN")}₫
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  sendOrderToServer();
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Xác nhận đặt hàng</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
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
  
  // Content
  content: {
    flex: 1,
  },
  
  // Section
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginLeft: 8,
    flex: 1,
  },
  itemCount: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  
  // Input Styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },

  // Address Input Group (Map Picker)
  addressInputGroup: {
    marginBottom: 16,
  },
  mapInputContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    color: "#1F2937",
    lineHeight: 22,
    marginLeft: 32, // Space for icon
  },
  mapInputPlaceholder: {
    color: "#9CA3AF",
  },
  mapInputIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIndicator: {
    marginRight: 8,
    backgroundColor: "#D1FAE5",
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
    color: "#6B7280",
    textDecorationLine: "underline",
  },

  // Manual Input Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  manualInputModal: {
    backgroundColor: "#FFFFFF",
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
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  manualInputDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  manualInputField: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 80,
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
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
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  manualInputConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  manualInputConfirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  manualInputConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  
  // Cart Items
  cartItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
  },
  itemImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
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
  itemVariant: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  variantText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
    marginRight: 12,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  unitPrice: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  
  // Empty Cart
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  
  // Separator
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  
  // Summary
  summaryContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  freeShipping: {
    fontSize: 16,
    fontWeight: "500",
    color: "#10B981",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6366F1",
  },
  
  // Bottom Container
  bottomContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bottomTotal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  itemsCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  // Confirmation Modal Styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  confirmModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
  },

  // Modal Header
  confirmModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  confirmModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  // Confirm Sections
  confirmSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  confirmSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },

  // Confirm Info Card
  confirmInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  confirmInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  confirmInfoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginLeft: 8,
    width: 80,
  },
  confirmInfoValue: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
    marginLeft: 8,
  },

  // Confirm Items Card
  confirmItemsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  confirmItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  confirmItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  confirmItemDetails: {
    flex: 1,
  },
  confirmItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  confirmItemVariant: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  confirmItemPricing: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmItemQuantity: {
    fontSize: 12,
    color: "#6B7280",
  },
  confirmItemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
  },

  // Confirm Summary Card
  confirmSummaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  confirmSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  confirmSummaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  confirmSummaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  confirmFreeShipping: {
    fontSize: 14,
    fontWeight: "500",
    color: "#10B981",
  },
  confirmDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  confirmTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  confirmTotalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6366F1",
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginLeft: 8,
    backgroundColor: "#6366F1",
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});