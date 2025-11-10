import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

const { width, height } = Dimensions.get("window");

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, coordinates: { latitude: number; longitude: number }) => void;
  initialAddress?: string;
}

export default function MapPickerModal({
  visible,
  onClose,
  onSelectAddress,
  initialAddress = "",
}: MapPickerModalProps) {
  const [region, setRegion] = useState<Region>({
    latitude: 10.8231, // Ho Chi Minh City default
    longitude: 106.6297,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const [selectedCoordinate, setSelectedCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Request location permission and get current location
  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập vị trí",
          "Ứng dụng cần quyền truy cập vị trí để hiển thị bản đồ chính xác hơn."
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setSelectedCoordinate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Get address for current location
      await reverseGeocode(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại");
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Reverse geocoding - convert coordinates to address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result.length > 0) {
        const location = result[0];
        const addressParts = [
          location.streetNumber,
          location.street,
          location.district,
          location.city,
          location.region,
          location.country,
        ].filter(Boolean);

        const fullAddress = addressParts.join(", ");
        setAddress(fullAddress);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  // Forward geocoding - search for places
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const result = await Location.geocodeAsync(searchQuery);

      if (result.length > 0) {
        const location = result[0];
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setRegion(newRegion);
        setSelectedCoordinate({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        await reverseGeocode(location.latitude, location.longitude);
      } else {
        Alert.alert("Không tìm thấy", "Không tìm thấy địa điểm phù hợp");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      Alert.alert("Lỗi", "Không thể tìm kiếm địa điểm");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle map press
  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoordinate({ latitude, longitude });
    await reverseGeocode(latitude, longitude);
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedCoordinate && address) {
      onSelectAddress(address, selectedCoordinate);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chọn Địa Chỉ</Text>
          <TouchableOpacity 
            style={styles.currentLocationButton} 
            onPress={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons name="locate" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm địa điểm..."
              placeholderTextColor="#999"
              onSubmitEditing={searchLocation}
              returnKeyType="search"
            />
            {isLoading && <ActivityIndicator size="small" color="#007AFF" />}
          </View>
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={searchLocation}
            disabled={isLoading}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChangeComplete={setRegion}
          >
            {selectedCoordinate && (
              <Marker
                coordinate={selectedCoordinate}
                title="Vị trí đã chọn"
                description={address}
              >
                <View style={styles.customMarker}>
                  <Ionicons name="location" size={30} color="#FF3B30" />
                </View>
              </Marker>
            )}
          </MapView>
          
          {/* Crosshair in center */}
          <View style={styles.crosshair}>
            <Ionicons name="add" size={30} color="#007AFF" />
          </View>
        </View>

        {/* Address Display */}
        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <Text style={styles.addressTitle}>Địa chỉ đã chọn:</Text>
          </View>
          <Text style={styles.addressText}>
            {address || "Chạm vào bản đồ để chọn địa chỉ"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              (!selectedCoordinate || !address) && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={!selectedCoordinate || !address}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Xác Nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e8ed",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  currentLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f8f9fa",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#1a1a1a",
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  crosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  addressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    paddingLeft: 28,
  },
  actionContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 15,
    marginLeft: 10,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});