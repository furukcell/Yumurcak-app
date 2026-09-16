from pathlib import Path

p = Path('src/screens/parent/parentShared.js')
s = p.read_text(encoding='utf-8')

if "../../context/ParentChildContext" not in s:
    s = s.replace(
        "import { useAuth } from '../../context/AuthContext';",
        "import { useAuth } from '../../context/AuthContext';\nimport { useParentChild } from '../../context/ParentChildContext';",
        1,
    )

s = s.replace(
    "  const selectedChild = children[0] || null;",
    "  const { selectedChild } = useParentChild();",
    1,
)

shell_marker = "  const bottomSafePadding = 96 + Math.max(insets.bottom || 0, 8);"
if "parentChildren" not in s:
    s = s.replace(
        shell_marker,
        shell_marker + "\n  const { children: parentChildren, selectedChild: shellSelectedChild, selectChild } = useParentChild();",
        1,
    )

header_marker = "      </View>\n      <KeyboardAvoidingView"
selector = '''      </View>
      {parentChildren.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          {parentChildren.map((child) => {
            const isSelected = String(child.id) === String(shellSelectedChild?.id);
            const name = `${child.ad || child.adSoyad || child.isim || 'Çocuk'} ${child.soyad || ''}`.trim();
            return (
              <TouchableOpacity
                key={child.id}
                onPress={() => selectChild(child.id)}
                activeOpacity={0.8}
                style={{ marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: isSelected ? THEME.primary : THEME.border, backgroundColor: isSelected ? THEME.primarySoft : THEME.card }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? THEME.primary : THEME.text }}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
      <KeyboardAvoidingView'''
if "parentChildren.length > 1" not in s:
    s = s.replace(header_marker, selector, 1)

p.write_text(s, encoding='utf-8')
