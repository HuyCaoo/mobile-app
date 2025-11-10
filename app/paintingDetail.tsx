'use client';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchData } from "../constants/api";

export default function PaintingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [painting, setPainting] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      fetchPainting(id as string);
      fetchVariants(id as string);
      fetchReviews(id as string);
    }
  }, [id]);

  // Lấy thông tin tranh
  const fetchPainting = async (paintingId: string) => {
    setLoading(true);
    try {
      const data = await fetchData(`/paintings/${paintingId}`);
      if (data.artist_id) {
        try {
          const artist = await fetchData(`/artists/${data.artist_id}`);
          data.artist_name = artist?.name || "Không rõ";
        } catch {
          data.artist_name = "Không rõ";
        }
      } else {
        data.artist_name = "Không rõ";
      }
      setPainting(data);
    } catch (err) {
      console.error("❌ Lỗi load chi tiết tranh:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy variants (size + material + giá + stock)
  const fetchVariants = async (paintingId: string) => {
    try {
      const data = await fetchData(`/painting_variants/painting/${paintingId}`);
      setVariants(data || []);
      if (data && data.length > 0) {
        setSelectedVariant(data[0]); // mặc định chọn variant đầu tiên
      }
    } catch (err) {
      console.error("❌ Lỗi load variants:", err);
    }
  };

  // Lấy reviews
  const fetchReviews = async (paintingId: string) => {
    try {
      const data = await fetchData(`/reviews/painting/${paintingId}`);
      
      // Lấy thông tin user cho mỗi review
      const reviewsWithUsers = await Promise.all(
        (data || []).map(async (review: any) => {
          try {
            const user = await fetchData(`/users/${review.user_id}`);
            return {
              ...review,
              user_name: user?.full_name || "Khách hàng ẩn danh"
            };
          } catch {
            return {
              ...review,
              user_name: "Khách hàng ẩn danh"
            };
          }
        })
      );
      
      setReviews(reviewsWithUsers);
    } catch (err) {
      console.error("❌ Lỗi load đánh giá:", err);
    }
  };

  // Thêm giỏ
  const addToCart = async () => {
    if (!painting || !selectedVariant) return;
    
    try {
      const savedCart = await AsyncStorage.getItem("cart");
      let cart = savedCart ? JSON.parse(savedCart) : [];

      const index = cart.findIndex(
        (i: any) => i.variant_id === selectedVariant.variant_id
      );
      
      // Kiểm tra nếu sản phẩm hết hàng
      const isOutOfStock = !selectedVariant.stock_quantity || selectedVariant.stock_quantity <= 0;
      
      if (index >= 0) {
        // Nếu có trong giỏ rồi, kiểm tra số lượng
        const newQuantity = cart[index].quantity + quantity;
        if (!isOutOfStock && newQuantity > selectedVariant.stock_quantity) {
          alert(`❌ Chỉ còn ${selectedVariant.stock_quantity} sản phẩm trong kho!`);
          return;
        }
        cart[index].quantity = newQuantity;
      } else {
        // Thêm mới vào giỏ
        if (!isOutOfStock && quantity > selectedVariant.stock_quantity) {
          alert(`❌ Chỉ còn ${selectedVariant.stock_quantity} sản phẩm trong kho!`);
          return;
        }
        cart.push({
          ...painting,
          ...selectedVariant,
          quantity: quantity,
          isPreOrder: isOutOfStock // Đánh dấu đặt trước
        });
      }

      await AsyncStorage.setItem("cart", JSON.stringify(cart));
      
      if (isOutOfStock) {
        alert("✅ Đã thêm vào giỏ! Sản phẩm sẽ được giao khi có hàng.");
      } else {
        alert("✅ Đã thêm vào giỏ!");
      }
    } catch (err) {
      console.error("❌ Lỗi thêm giỏ:", err);
      alert("❌ Có lỗi xảy ra khi thêm vào giỏ!");
    }
  };

  // Tính average rating
  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = total / reviews.length;
    return isNaN(average) ? 0 : average;
  };

  if (loading || !painting) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết tranh</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải thông tin tranh...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết tranh</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: painting.image_url }} style={styles.heroImage} />
          <View style={styles.imageOverlay}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {getAverageRating().toFixed(1)} ({reviews.length})
              </Text>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          {/* Title & Artist */}
          <View style={styles.titleSection}>
            <Text style={styles.productTitle}>{painting.title}</Text>
            <View style={styles.artistRow}>
              <Ionicons name="brush" size={16} color="#6B7280" />
              <Text style={styles.artistName}>Họa sĩ {painting.artist_name}</Text>
            </View>
          </View>

          {/* Price */}
          {selectedVariant && (
            <View style={styles.priceSection}>
              <Text style={styles.priceAmount}>
                {Number(selectedVariant.price).toLocaleString("vi-VN")}₫
              </Text>
              <View style={styles.stockInfo}>
                <Ionicons name="cube" size={16} color="#6B7280" />
                <Text style={[
                  styles.stockText,
                  (!selectedVariant.stock_quantity || selectedVariant.stock_quantity <= 0) && styles.outOfStockText
                ]}>
                  {selectedVariant.stock_quantity && selectedVariant.stock_quantity > 0 
                    ? `Còn ${selectedVariant.stock_quantity} sản phẩm`
                    : "Hết hàng - Có thể đặt trước"
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Material Info */}
          {selectedVariant && (
            <View style={styles.materialSection}>
              <View style={styles.materialItem}>
                <Ionicons name="layers" size={18} color="#6366F1" />
                <Text style={styles.materialText}>{selectedVariant.material || "Chất liệu tiêu chuẩn"}</Text>
              </View>
            </View>
          )}

          {/* Size Selection */}
          {variants.length > 0 && (
            <View style={styles.variantSection}>
              <Text style={styles.sectionTitle}>Chọn kích thước</Text>
              <View style={styles.variantGrid}>
                {variants.map((variant: any) => (
                  <TouchableOpacity
                    key={variant.variant_id}
                    style={[
                      styles.variantOption,
                      selectedVariant?.variant_id === variant.variant_id && styles.variantSelected,
                    ]}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <Text style={[
                      styles.variantOptionText,
                      selectedVariant?.variant_id === variant.variant_id && styles.variantSelectedText,
                    ]}>
                      {variant.size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity Selection */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Số lượng</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#9CA3AF" : "#6366F1"} />
              </TouchableOpacity>
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  setQuantity((q) => {
                    // Nếu hết hàng, cho phép tăng không giới hạn (đặt trước)
                    if (!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0) {
                      return q + 1;
                    }
                    // Nếu còn hàng, giới hạn theo stock
                    return Math.min(selectedVariant.stock_quantity, q + 1);
                  })
                }
              >
                <Ionicons name="add" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pre-order Notice */}
          {(!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0) && (
            <View style={styles.preOrderNotice}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <View style={styles.preOrderText}>
                <Text style={styles.preOrderTitle}>Đặt hàng trước</Text>
                <Text style={styles.preOrderDescription}>
                  Sản phẩm tạm hết hàng. Bạn có thể đặt trước và chúng tôi sẽ giao hàng khi có stock.
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
            <Text style={styles.descriptionText}>
              {painting.description || "Tác phẩm nghệ thuật độc đáo, được tạo ra với tâm huyết và kỹ thuật tinh tế. Mỗi nét vẽ đều chứa đựng cảm xúc và câu chuyện riêng của họa sĩ."}
            </Text>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Đánh giá từ khách hàng</Text>
            {reviews.length > 0 && (
              <View style={styles.reviewsSummary}>
                <View style={styles.averageRating}>
                  <Text style={styles.averageRatingNumber}>{getAverageRating().toFixed(1)}</Text>
                  <View style={styles.averageStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(getAverageRating()) ? "star" : "star-outline"}
                        size={16}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>({reviews.length} đánh giá)</Text>
                </View>
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="star-outline" size={48} color="#9CA3AF" />
              <Text style={styles.noReviewsTitle}>Chưa có đánh giá</Text>
              <Text style={styles.noReviewsText}>Hãy là người đầu tiên đánh giá sản phẩm này</Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 3).map((review: any) => (
                <View key={review.review_id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <Text style={styles.reviewUserName}>{review.user_name}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= review.rating ? "star" : "star-outline"}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString("vi-VN")}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
              {reviews.length > 3 && (
                <Text style={styles.moreReviews}>
                  và {reviews.length - 3} đánh giá khác...
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add to Cart Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerPrice}>
            {selectedVariant ? `${Number(selectedVariant.price * quantity).toLocaleString("vi-VN")}₫` : "0₫"}
          </Text>
          <Text style={styles.footerQuantity}>{quantity} sản phẩm</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            (!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0) && styles.preOrderButton
          ]} 
          onPress={addToCart}
          disabled={!selectedVariant}
        >
          <Ionicons name="bag-add" size={20} color="#FFFFFF" />
          <Text style={styles.addToCartText}>
            {(!selectedVariant?.stock_quantity || selectedVariant.stock_quantity <= 0) 
              ? "Đặt trước" 
              : "Thêm vào giỏ"
            }
          </Text>
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
    backgroundColor: "#6366F1",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  
  // Content
  content: {
    flex: 1,
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
  
  // Hero Image
  imageContainer: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 400,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  
  // Product Card
  productCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistName: {
    fontSize: 16,
    color: "#6B7280",
    marginLeft: 8,
    fontWeight: "500",
  },
  
  // Price Section
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#EF4444",
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  outOfStockText: {
    color: "#F59E0B",
    fontWeight: "600",
  },
  
  // Material Section
  materialSection: {
    marginBottom: 20,
  },
  materialItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  materialText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
    fontWeight: "500",
  },
  
  // Variant Section
  variantSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  variantGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  variantOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    minWidth: 80,
    alignItems: "center",
  },
  variantSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#6366F1",
  },
  variantOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  variantSelectedText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  
  // Quantity Section
  quantitySection: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quantityDisplay: {
    marginHorizontal: 16,
    minWidth: 60,
    alignItems: "center",
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  
  // Description Section
  descriptionSection: {
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  
  // Pre-order Notice
  preOrderNotice: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  preOrderText: {
    flex: 1,
    marginLeft: 12,
  },
  preOrderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  preOrderDescription: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  
  // Reviews Card
  reviewsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewsSummary: {
    alignItems: "flex-end",
  },
  averageRating: {
    alignItems: "center",
  },
  averageRatingNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  averageStars: {
    flexDirection: "row",
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  
  // No Reviews
  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 4,
  },
  noReviewsText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  
  // Reviews List
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: "row",
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  moreReviews: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 8,
  },
  
  // Footer
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  footerInfo: {
    flex: 1,
    marginRight: 16,
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 2,
  },
  footerQuantity: {
    fontSize: 14,
    color: "#6B7280",
  },
  addToCartButton: {
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  preOrderButton: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
  },
  addToCartDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});