// ============================================================
// YUMURCAK — AdminStack.js
// Yönetici navigasyon stack'i
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ClassListScreen from '../screens/admin/ClassListScreen';
import ClassFormScreen from '../screens/admin/ClassFormScreen';
import ChildListScreen from '../screens/admin/ChildListScreen';
import ChildFormScreen from '../screens/admin/ChildFormScreen';
import ChildDetailScreen from '../screens/admin/ChildDetailScreen';
import TeacherListScreen from '../screens/admin/TeacherListScreen';
import TeacherFormScreen from '../screens/admin/TeacherFormScreen';
import VeliListScreen from '../screens/admin/VeliListScreen';
import VeliFormScreen from '../screens/admin/VeliFormScreen';
import AnnouncementListScreen from '../screens/admin/AnnouncementListScreen';
import AnnouncementFormScreen from '../screens/admin/AnnouncementFormScreen';
import PaymentListScreen from '../screens/admin/PaymentListScreen';
import PaymentFormScreen from '../screens/admin/PaymentFormScreen';
import LessonScheduleListScreen from '../screens/admin/LessonScheduleListScreen';
import LessonScheduleFormScreen from '../screens/admin/LessonScheduleFormScreen';
import EventListScreen from '../screens/admin/EventListScreen';
import EventFormScreen from '../screens/admin/EventFormScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#3C3489' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Yönetim Paneli' }} />
      <Stack.Screen name="ClassList" component={ClassListScreen} options={{ title: 'Sınıflar' }} />
      <Stack.Screen name="ClassForm" component={ClassFormScreen} options={{ title: 'Sınıf Ekle/Düzenle' }} />
      <Stack.Screen name="ChildList" component={ChildListScreen} options={{ title: 'Çocuklar' }} />
      <Stack.Screen name="ChildForm" component={ChildFormScreen} options={{ title: 'Çocuk Ekle/Düzenle' }} />
      <Stack.Screen name="ChildDetail" component={ChildDetailScreen} options={{ title: 'Çocuk Detayı' }} />
      <Stack.Screen name="TeacherList" component={TeacherListScreen} options={{ title: 'Öğretmenler' }} />
      <Stack.Screen name="TeacherForm" component={TeacherFormScreen} options={{ title: 'Öğretmen Ekle/Düzenle' }} />
      <Stack.Screen name="VeliList" component={VeliListScreen} options={{ title: 'Veliler' }} />
      <Stack.Screen name="VeliForm" component={VeliFormScreen} options={{ title: 'Veli Ekle/Düzenle' }} />
      <Stack.Screen name="AnnouncementList" component={AnnouncementListScreen} options={{ title: 'Duyurular' }} />
      <Stack.Screen name="AnnouncementForm" component={AnnouncementFormScreen} options={{ title: 'Duyuru Oluştur' }} />
      <Stack.Screen name="PaymentList" component={PaymentListScreen} options={{ title: 'Ödemeler' }} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Ödeme Ekle/Düzenle' }} />
      <Stack.Screen name="LessonScheduleList" component={LessonScheduleListScreen} options={{ title: 'Ders Programı' }} />
      <Stack.Screen name="LessonScheduleForm" component={LessonScheduleFormScreen} options={{ title: 'Programı Düzenle' }} />
      <Stack.Screen name="EventList" component={EventListScreen} options={{ title: 'Etkinlikler' }} />
      <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'Etkinlik Ekle/Düzenle' }} />
    </Stack.Navigator>
  );
}
