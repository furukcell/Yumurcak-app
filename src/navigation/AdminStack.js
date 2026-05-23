import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ClassListScreen from '../screens/admin/ClassListScreen';
import ClassFormScreen from '../screens/admin/ClassFormScreen';
import ChildListScreen from '../screens/admin/ChildListScreen';
import ChildFormScreen from '../screens/admin/ChildFormScreen';
import TeacherListScreen from '../screens/admin/TeacherListScreen';
import TeacherFormScreen from '../screens/admin/TeacherFormScreen';
import AnnouncementListScreen from '../screens/admin/AnnouncementListScreen';
import AnnouncementFormScreen from '../screens/admin/AnnouncementFormScreen';

export type AdminStackParams = {
  Dashboard: undefined;
  ClassList: undefined;
  ClassForm: { classId?: string };
  ChildList: undefined;
  ChildForm: { childId?: string };
  TeacherList: undefined;
  TeacherForm: { teacherId?: string };
  AnnouncementList: undefined;
  AnnouncementForm: { announcementId?: string };
};

const Stack = createStackNavigator<AdminStackParams>();

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
      <Stack.Screen name="TeacherList" component={TeacherListScreen} options={{ title: 'Öğretmenler' }} />
      <Stack.Screen name="TeacherForm" component={TeacherFormScreen} options={{ title: 'Öğretmen Ekle/Düzenle' }} />
      <Stack.Screen name="AnnouncementList" component={AnnouncementListScreen} options={{ title: 'Duyurular' }} />
      <Stack.Screen name="AnnouncementForm" component={AnnouncementFormScreen} options={{ title: 'Duyuru Oluştur' }} />
    </Stack.Navigator>
  );
}
