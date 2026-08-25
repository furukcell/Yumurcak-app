import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

/**
 * Header + form içeriğini sarmalayan ortak klavye-uyumlu bileşen.
 *
 * Sorun: Ekranlarda keyboardVerticalOffset sabit bir sayı (90) olarak
 * kopyala-yapıştır yapılmıştı, ama her ekranın header'ı farklı yükseklikte
 * olduğu için input alanları klavyenin arkasında / çok altta kalıyordu.
 *
 * Çözüm: Header'ı bir View içine alıp onLayout ile gerçek yüksekliğini
 * ölçüyoruz, offset olarak o gerçek değeri veriyoruz. Android tarafına
 * hiç dokunulmuyor (behavior="height", offset=0 olarak aynı kalıyor).
 *
 * Kullanım:
 *   <KeyboardAwareScreen header={<ScreenHeader title="..." />} style={styles.screen}>
 *     <ScrollView>...</ScrollView>
 *   </KeyboardAwareScreen>
 */
export default function KeyboardAwareScreen({ header, children, style }) {
  const [headerHeight, setHeaderHeight] = useState(0);

  const onHeaderLayout = useCallback((e) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  return (
    <View style={[{ flex: 1 }, style]}>
      {header ? <View onLayout={onHeaderLayout}>{header}</View> : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
