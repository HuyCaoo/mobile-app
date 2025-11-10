'use client';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchData } from "../constants/api";

export default function PaintingScreen() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState("Người dùng");
  const [artists, setArtists] = useState<Record<number, string>>({});
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000000 });

  useEffect(() => {
    loadUser();
    handleFetchPaintings();
    fetchArtists();
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

  const handleFetchPaintings = async () => {
    setLoading(true);
    try {
      const paintings = await fetchData("/paintings");
      const variants = await fetchData("/painting_variants");

      const grouped: Record<number, any[]> = {};
      variants.forEach((v: any) => {
        const pid = Number(v.painting_id);
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(v);
      });

      const arr = paintings.map((p: any) => {
        const pid = Number(p.painting_id);
        const vs = grouped[pid] || [];

        if (vs.length > 0) {
          const prices = vs.map((v) => Number(v.price) || 0);
          p.min_price = Math.min(...prices);
          p.max_price = Math.max(...prices);
        } else {
          p.min_price = Number(p.price) || 0;
          p.max_price = Number(p.price) || 0;
        }

        return p;
      });

      setData(arr);
      setFilteredData(arr);
      
      // Calculate price range for filter
      if (arr.length > 0) {
        const allPrices = arr.flatMap((p: any) => [p.min_price, p.max_price]);
        const minPriceInData = Math.min(...allPrices);
        const maxPriceInData = Math.max(...allPrices);
        setPriceRange({ min: minPriceInData, max: maxPriceInData });
      }
    } catch (err) {
      console.error("❌ Lỗi load tranh/variants:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const json = await fetchData("/artists");
      const map: Record<number, string> = {};
      json.forEach((a: any) => {
        map[a.artist_id] = a.name;
      });
      setArtists(map);
    } catch (err) {
      console.error("❌ Lỗi load artists:", err);
    }
  };

  const loadCartCount = async () => {
    try {
      const savedCart = await AsyncStorage.getItem("cart");
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      setCartCount(parsed.length);
    } catch (err) {
      console.error("❌ Lỗi load giỏ:", err);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    applyFilters(text, minPrice, maxPrice);
  };

  const handlePriceFilter = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    applyFilters(searchText, min, max);
  };

  const applyFilters = (text: string, minPriceFilter: string, maxPriceFilter: string) => {
    let filtered = data;

    // Filter by title
    if (text.trim()) {
      const normalized = text.toLowerCase().trim();
      filtered = filtered.filter((item: any) =>
        (item.title ?? "").toLowerCase().includes(normalized)
      );
    }

    // Filter by price
    if (minPriceFilter || maxPriceFilter) {
      const minPriceNum = minPriceFilter ? Number(minPriceFilter) : 0;
      const maxPriceNum = maxPriceFilter ? Number(maxPriceFilter) : Infinity;
      
      filtered = filtered.filter((item: any) => {
        const itemMinPrice = item.min_price || 0;
        const itemMaxPrice = item.max_price || item.min_price || 0;
        
        // Check if item price range overlaps with filter range
        return itemMinPrice <= maxPriceNum && itemMaxPrice >= minPriceNum;
      });
    }

    setFilteredData(filtered);
  };

  const clearPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    applyFilters(searchText, "", "");
  };

  return (
    <View style={styles.container}>
      {/* 🔝 Thanh chào user */}
      <View style={styles.topBar}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>👋</Text>
          <Text style={styles.welcomeMessage}>Xin chào, {userName}!</Text>
        </View>
      </View>

      {/* Header + Giỏ hàng */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerEmoji}>🎨</Text>
          <Text style={styles.header}>Bộ sưu tập tranh</Text>
        </View>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => router.push("/Cart")}
        >
          <Ionicons name="bag-outline" size={20} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tranh theo tiêu đề..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={handleSearch}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowPriceFilter(!showPriceFilter)}
        >
          <Ionicons 
            name="options-outline" 
            size={20} 
            color={showPriceFilter ? "#6366F1" : "#9CA3AF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Price Filter */}
      {showPriceFilter && (
        <View style={styles.priceFilterContainer}>
          <View style={styles.priceFilterHeader}>
            <Text style={styles.priceFilterTitle}>💰 Lọc theo giá</Text>
            {(minPrice || maxPrice) && (
              <TouchableOpacity onPress={clearPriceFilter}>
                <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.priceInputContainer}>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceInputLabel}>Từ</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={minPrice}
                onChangeText={(text) => handlePriceFilter(text, maxPrice)}
                keyboardType="numeric"
              />
              <Text style={styles.currencyText}>₫</Text>
            </View>
            
            <View style={styles.priceSeparator}>
              <Text style={styles.separatorText}>-</Text>
            </View>
            
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceInputLabel}>Đến</Text>
              <TextInput
                style={styles.priceInput}
                placeholder={priceRange.max.toLocaleString()}
                placeholderTextColor="#9CA3AF"
                value={maxPrice}
                onChangeText={(text) => handlePriceFilter(minPrice, text)}
                keyboardType="numeric"
              />
              <Text style={styles.currencyText}>₫</Text>
            </View>
          </View>

          <View style={styles.quickPriceButtons}>
            <TouchableOpacity 
              style={styles.quickPriceButton}
              onPress={() => handlePriceFilter("", "10000000")}
            >
              <Text style={styles.quickPriceText}>{"< 10 triệu"}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickPriceButton}
              onPress={() => handlePriceFilter("10000000", "15000000")}
            >
              <Text style={styles.quickPriceText}>10-15 triệu</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickPriceButton}
              onPress={() => handlePriceFilter("15000000", "")}
            >
              <Text style={styles.quickPriceText}>{"> 15 triệu"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải tranh...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, i) => item.painting_id?.toString() || i.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/paintingDetail",
                  params: { id: item.painting_id },
                })
              }
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <View style={styles.artistContainer}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={styles.artist} numberOfLines={1}>
                    {artists[item.artist_id] || "Không rõ"}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>
                    {item.min_price === item.max_price
                      ? `${Number(item.min_price).toLocaleString()}₫`
                      : `${Number(item.min_price).toLocaleString()}₫ - ${Number(
                          item.max_price
                        ).toLocaleString()}₫`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {/* Tranh */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/tranh")}
        >
          <View style={[styles.tabIconContainer, styles.activeTab]}>
            <Ionicons name="image" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.tabText, styles.activeTabText]}>Tranh</Text>
        </TouchableOpacity>

        {/* Họa sĩ */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/artists")}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons name="color-palette-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Họa sĩ</Text>
        </TouchableOpacity>

        {/* Đơn hàng */}
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.replace("/MyOrdersScreen")}
        >
          <View style={styles.tabIconContainer}>
            <Ionicons name="receipt-outline" size={22} color="#9CA3AF" />
          </View>
          <Text style={styles.tabText}>Đơn hàng</Text>
        </TouchableOpacity>

        {/* Người dùng */}
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
  
  // Top Bar Styles
  topBar: { 
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeText: { 
    fontSize: 24,
    marginRight: 8,
  },
  welcomeMessage: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#1F2937",
  },

  // Header Styles
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },
  headerTextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  header: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#1F2937",
  },
  cartButton: {
    backgroundColor: "#6366F1",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Search Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  filterButton: {
    marginLeft: 12,
    padding: 4,
  },

  // Price Filter Styles
  priceFilterContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  priceFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  priceFilterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  clearFilterText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  priceInputWrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  priceInputLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 8,
    minWidth: 24,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    textAlign: "right",
  },
  currencyText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  priceSeparator: {
    marginHorizontal: 12,
  },
  separatorText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  quickPriceButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickPriceButton: {
    flex: 1,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  quickPriceText: {
    fontSize: 12,
    color: "#0284C7",
    fontWeight: "500",
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

  // Card Styles
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    maxWidth: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
  },
  image: { 
    width: "100%", 
    aspectRatio: 1,
    backgroundColor: "#F3F4F6",
  },
  imageOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { 
    padding: 16,
  },
  title: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 22,
  },
  artistContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  artist: { 
    fontSize: 14, 
    color: "#6B7280",
    marginLeft: 6,
    flex: 1,
  },
  priceContainer: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
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
});