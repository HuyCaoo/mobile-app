import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../constants/config";

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // Thêm state cho sản phẩm cụ thể
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Gửi đánh giá
  const handleSubmitReview = async () => {
    if (!selectedOrder || !selectedProduct) return;
    try {
      const storedUser = await AsyncStorage.getItem("user");
      const user = JSON.parse(storedUser || "{}");

      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          order_id: selectedOrder.order_id,
          painting_id: selectedProduct.painting.painting_id, // Đánh giá sản phẩm cụ thể
          rating,
          comment: reviewText,
        }),
      });

      if (!res.ok) throw new Error("Gửi đánh giá thất bại!");

      alert("🎉 Cảm ơn bạn đã đánh giá!");
      setShowReviewModal(false);
      setRating(0);
      setReviewText("");
      setSelectedProduct(null);

      // Cập nhật lại danh sách đơn hàng sau khi đánh giá
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Không thể gửi đánh giá!");
    }
  };

  // Hủy đơn hàng
  const handleCancelOrder = async (orderId: number) => {
    try {
      // Hiển thị dialog xác nhận
      Alert.alert(
        "Xác nhận hủy đơn hàng",
        "Bạn có chắc chắn muốn hủy đơn hàng này không?",
        [
          {
            text: "Không",
            style: "cancel",
          },
          {
            text: "Hủy đơn hàng",
            style: "destructive",
            onPress: async () => {
              try {
                const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: "Cancelled",
                  }),
                });

                if (!res.ok) throw new Error("Không thể hủy đơn hàng!");

                alert("✅ Đơn hàng đã được hủy thành công!");
                
                // Cập nhật lại danh sách đơn hàng
                fetchOrders();
              } catch (err) {
                console.error(err);
                alert("❌ Không thể hủy đơn hàng. Vui lòng thử lại!");
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error(err);
      alert("❌ Có lỗi xảy ra!");
    }
  };

  // Tải danh sách đơn hàng
  const fetchOrders = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        alert("Bạn chưa đăng nhập!");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const res = await fetch(`${API_BASE_URL}/orders/user/${user.user_id}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data))
        throw new Error(data.message || "Không thể tải đơn hàng!");

      // Lấy TẤT CẢ reviews của user hiện tại một lần
      const resAllReviews = await fetch(`${API_BASE_URL}/reviews?user_id=${user.user_id}`);
      const allUserReviews = resAllReviews.ok ? await resAllReviews.json() : [];

      // Load chi tiết sản phẩm + review cho từng đơn hàng
      const ordersWithDetails = await Promise.all(
        data.map(async (order: any) => {
          // Lấy chi tiết tranh
          const resDetail = await fetch(
            `${API_BASE_URL}/order_details/order/${order.order_id}`
          );
          const orderDetails = await resDetail.json();

          const enrichedDetails = await Promise.all(
            orderDetails.map(async (detail: any) => {
              const resPainting = await fetch(
                `${API_BASE_URL}/paintings/${detail.painting_id}`
              );
              const painting = await resPainting.json();

              const resVariant = await fetch(
                `${API_BASE_URL}/painting_variants/${detail.painting_variants_id}`
              );
              const variant = await resVariant.json();

              // Tìm review của user cho sản phẩm này trong đơn hàng này (chỉ khi đã Completed)
              let userReview = null;
              if (order.status === "Completed") {
                userReview = allUserReviews.find((review: any) => 
                  review.order_id === order.order_id && 
                  review.painting_id === detail.painting_id &&
                  review.user_id === user.user_id
                ) || null;
              }

              return { 
                ...detail, 
                painting, 
                variant,
                review: userReview
              };
            })
          );

          return {
            ...order,
            order_details: enrichedDetails,
          };
        })
      );

      const sortedOrders = ordersWithDetails.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrders(sortedOrders);
    } catch (err) {
      console.error("❌ Lỗi tải đơn hàng:", err);
      alert("Không thể tải đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Lấy màu status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "#10B981";
      case "Cancelled": return "#EF4444";
      case "Pending": return "#F59E0B";
      case "Shipping": return "#3B82F6";
      default: return "#6B7280";
    }
  };

  // Lấy icon status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return "checkmark-circle";
      case "Cancelled": return "close-circle";
      case "Pending": return "time";
      case "Shipping": return "car";
      default: return "help-circle";
    }
  };

  // Render từng đơn hàng
  const renderOrderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.orderCard}>
        {/* Header đơn hàng */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Đơn hàng</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString("vi-VN")}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Thông tin giao hàng */}
        <View style={styles.shippingInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{item.full_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{item.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{item.phone}</Text>
          </View>
          {item.note && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={16} color="#6B7280" />
              <Text style={styles.infoText}>{item.note}</Text>
            </View>
          )}
        </View>

        {/* Chi tiết sản phẩm */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          {item.order_details?.map((detail: any, idx: number) => (
            <View key={idx} style={styles.productItem}>
              <Image
                source={{ uri: detail.painting?.image_url }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{detail.painting?.title}</Text>
                <Text style={styles.productVariant}>
                  {detail.variant?.size} • {detail.variant?.material}
                </Text>
                <View style={styles.productPricing}>
                  <Text style={styles.productQuantity}>x{detail.quantity}</Text>
                  <Text style={styles.productPrice}>
                    {Number(detail.unit_price || 0).toLocaleString("vi-VN")}₫
                  </Text>
                </View>

                {/* Review section cho từng sản phẩm */}
                {detail.review ? (
                  <View style={styles.productReviewSection}>
                    <Text style={styles.productReviewTitle}>Đã đánh giá:</Text>
                    <View style={styles.productReviewContent}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= detail.review.rating ? "star" : "star-outline"}
                            size={16}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={styles.productReviewComment}>{detail.review.comment}</Text>
                    </View>
                  </View>
                ) : (
                  item.status === "Completed" && (
                    <TouchableOpacity
                      style={styles.productReviewButton}
                      onPress={() => {
                        setSelectedOrder(item);
                        setSelectedProduct(detail);
                        setShowReviewModal(true);
                      }}
                    >
                      <Ionicons name="star" size={16} color="#FFFFFF" />
                      <Text style={styles.productReviewButtonText}>Đánh giá sản phẩm</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Tổng tiền */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
          <Text style={styles.totalAmount}>
            {Number(item.total_price || 0).toLocaleString("vi-VN")}₫
          </Text>
        </View>

        {/* Nút hủy đơn hàng (chỉ hiện khi Pending) */}
        {item.status === "Pending" && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={styles.cancelOrderButton}
              onPress={() => handleCancelOrder(item.order_id)}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.cancelOrderButtonText}>Hủy đơn hàng</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
        </View>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/tranh")}>
            <Ionicons name="image" size={24} color="#9CA3AF" />
            <Text style={styles.tabTextInactive}>Tranh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/artists")}>
            <Ionicons name="color-palette" size={24} color="#9CA3AF" />
            <Text style={styles.tabTextInactive}>Họa sĩ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="receipt" size={24} color="#6366F1" />
            <Text style={styles.tabTextActive}>Đơn hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/user")}>
            <Ionicons name="person-circle" size={24} color="#9CA3AF" />
            <Text style={styles.tabTextInactive}>Cá nhân</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length > 0 ? `${orders.length} đơn hàng` : "Chưa có đơn hàng"}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptyText}>
              Các đơn hàng của bạn sẽ hiển thị tại đây
            </Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => router.replace("/tranh")}
            >
              <Text style={styles.shopButtonText}>Mua sắm ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item: any) => item.order_id.toString()}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đánh giá sản phẩm</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowReviewModal(false);
                  setSelectedProduct(null);
                  setRating(0);
                  setReviewText("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Hiển thị sản phẩm đang đánh giá */}
            {selectedProduct && (
              <View style={styles.reviewProductInfo}>
                <Image
                  source={{ uri: selectedProduct.painting?.image_url }}
                  style={styles.reviewProductImage}
                />
                <View style={styles.reviewProductDetails}>
                  <Text style={styles.reviewProductTitle}>{selectedProduct.painting?.title}</Text>
                  <Text style={styles.reviewProductVariant}>
                    {selectedProduct.variant?.size} • {selectedProduct.variant?.material}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Đánh giá của bạn</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={36}
                      color="#F59E0B"
                      style={styles.starButton}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Nhận xét</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setSelectedProduct(null);
                  setRating(0);
                  setReviewText("");
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSubmitReview} 
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/tranh")}>
          <Ionicons name="image" size={24} color="#9CA3AF" />
          <Text style={styles.tabTextInactive}>Tranh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/artists")}>
          <Ionicons name="color-palette" size={24} color="#9CA3AF" />
          <Text style={styles.tabTextInactive}>Họa sĩ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="receipt" size={24} color="#6366F1" />
          <Text style={styles.tabTextActive}>Đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace("/user")}>
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
  
  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  
  // Empty State
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
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // List
  listContainer: {
    paddingBottom: 20,
  },
  
  // Order Card
  orderCard: {
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
  
  // Order Header
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // Shipping Info
  shippingInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  
  // Products Section
  productsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  productPricing: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productQuantity: {
    fontSize: 14,
    color: "#6B7280",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  
  // Product Review Section
  productReviewSection: {
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  productReviewTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    marginBottom: 4,
  },
  productReviewContent: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  starsRow: {
    flexDirection: "row",
    marginRight: 8,
  },
  productReviewComment: {
    fontSize: 12,
    color: "#374151",
    fontStyle: "italic",
    flex: 1,
  },
  
  // Product Review Button
  productReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  productReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  
  // Total Section
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6366F1",
  },

  // Order Actions
  orderActions: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 160,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  
  // Review Product Info
  reviewProductInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  reviewProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewProductDetails: {
    flex: 1,
  },
  reviewProductTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  reviewProductVariant: {
    fontSize: 14,
    color: "#6B7280",
  },
  
  // Rating Section
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starButton: {
    marginHorizontal: 4,
  },
  
  // Comment Section
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    color: "#374151",
  },
  
  // Modal Actions
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: "#6366F1",
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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