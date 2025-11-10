// app/AboutApp.tsx
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function AboutApp() {
  const navigation: any = useNavigation();

  return (
    <ScrollView style={styles.container}>
      {/* Nút quay lại */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Quay lại</Text>
      </TouchableOpacity>

      {/* Tiêu đề */}
      <Text style={styles.title}>ℹ️ Về ứng dụng</Text>

      {/* Nội dung */}
      <Text style={styles.text}>
        Ứng dụng <Text style={styles.highlight}>MyArtShop</Text> được phát triển nhằm mục đích
        trưng bày và bán tranh nghệ thuật trực tuyến.
      </Text>

      <Text style={styles.text}>
        Người dùng có thể:
        {"\n"}• Đăng ký và đăng nhập tài khoản
        {"\n"}• Xem danh sách tranh
        {"\n"}• Xem chi tiết, giá bán
        {"\n"}• Quản lý thông tin cá nhân
        {"\n"}• Thay đổi mật khẩu
      </Text>

      <Text style={styles.text}>
        Phiên bản hiện tại: <Text style={styles.highlight}>1.0.0</Text>
      </Text>

      <Text style={styles.text}>
        Tác giả: <Text style={styles.highlight}>HUYCAO</Text>
      </Text>

      <Text style={styles.footer}>© 2025 - MyArtShop</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40, backgroundColor: "#fff" },
  backBtn: { marginBottom: 15 },
  backText: { color: "#007AFF", fontSize: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  text: { fontSize: 15, marginBottom: 12, lineHeight: 22, color: "#333" },
  highlight: { fontWeight: "bold", color: "orange" },
  footer: { marginTop: 30, textAlign: "center", color: "gray" },
});
