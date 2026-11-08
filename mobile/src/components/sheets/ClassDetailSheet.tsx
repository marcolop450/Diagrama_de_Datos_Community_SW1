import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  StyleSheet 
} from 'react-native';
import { 
  Layers, 
  Key, 
  FileCode2, 
  X, 
  ShieldCheck, 
  GitFork 
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { ClassNodeData } from '../../types/diagram';
import { useMobileProjectStore } from '../../stores/projectStore';

interface ClassDetailSheetProps {
  classData: ClassNodeData | null;
  onClose: () => void;
}

export const ClassDetailSheet: React.FC<ClassDetailSheetProps> = ({ classData, onClose }) => {
  const { edges, nodes } = useMobileProjectStore();

  if (!classData) return null;

  // Filtrar relaciones donde participa esta clase
  const connectedEdges = edges.filter(
    (e) => e.source === classData.id || e.target === classData.id
  );

  return (
    <Modal visible={!!classData} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Barra superior de arrastre */}
          <View style={styles.dragHandle} />

          {/* Encabezado de la Clase */}
          <View style={styles.header}>
            <View style={styles.titleArea}>
              <View style={styles.classIcon}>
                <Layers size={18} color={THEME.colors.accentPrimaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.stereotypeRow}>
                  {classData.stereotype ? (
                    <Text style={styles.stereotypeText}>
                      «{classData.stereotype}»
                    </Text>
                  ) : null}
                  {classData.isAbstract && (
                    <Text style={styles.abstractBadge}>Abstracta</Text>
                  )}
                </View>
                <Text style={styles.classNameText}>{classData.name}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* SECCIÓN 1: ATRIBUTOS TIPADOS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Key size={14} color={THEME.colors.accentWarning} />
                <Text style={styles.sectionTitle}>
                  Atributos ({classData.attributes?.length || 0})
                </Text>
              </View>

              {classData.attributes && classData.attributes.length > 0 ? (
                <View style={styles.itemsList}>
                  {classData.attributes.map((attr, idx) => (
                    <View key={attr.id || `attr-${idx}`} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.visibilityText}>
                          {attr.visibility === 'public' || attr.visibility === '+'
                            ? '+'
                            : attr.visibility === 'private' || attr.visibility === '-'
                            ? '-'
                            : '#'}
                        </Text>
                        <Text style={styles.fieldName}>{attr.name}</Text>
                        {attr.isPrimaryKey && (
                          <View style={styles.pkBadge}>
                            <Text style={styles.pkBadgeText}>{'{PK}'}</Text>
                          </View>
                        )}
                        {attr.isForeignKey && (
                          <View style={styles.fkBadge}>
                            <Text style={styles.fkBadgeText}>{'{FK}'}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.fieldType}>{attr.type || 'String'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Sin atributos declarados</Text>
              )}
            </View>

            {/* SECCIÓN 2: MÉTODOS Y OPERACIONES */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <FileCode2 size={14} color={THEME.colors.accentSuccess} />
                <Text style={styles.sectionTitle}>
                  Métodos ({classData.methods?.length || 0})
                </Text>
              </View>

              {classData.methods && classData.methods.length > 0 ? (
                <View style={styles.itemsList}>
                  {classData.methods.map((m, idx) => {
                    const paramsStr = (m.parameters || [])
                      .map((p) => `${p.name}: ${p.type}`)
                      .join(', ');
                    return (
                      <View key={m.id || `method-${idx}`} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <Text style={styles.visibilityText}>
                            {m.visibility === 'private' ? '-' : '+'}
                          </Text>
                          <Text style={styles.fieldName}>
                            {m.name}({paramsStr})
                          </Text>
                        </View>
                        <Text style={[styles.fieldType, { color: THEME.colors.accentSuccessLight }]}>
                          : {m.returnType || 'void'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Sin métodos declarados</Text>
              )}
            </View>

            {/* SECCIÓN 3: ASOCIACIONES Y RELACIONES */}
            <View style={[styles.sectionCard, { marginBottom: 30 }]}>
              <View style={styles.sectionHeader}>
                <GitFork size={14} color={THEME.colors.accentInfo} />
                <Text style={styles.sectionTitle}>
                  Relaciones Ortogonales ({connectedEdges.length})
                </Text>
              </View>

              {connectedEdges.length > 0 ? (
                <View style={styles.itemsList}>
                  {connectedEdges.map((edge) => {
                    const isSource = edge.source === classData.id;
                    const otherId = isSource ? edge.target : edge.source;
                    const otherNode = nodes.find((n) => n.id === otherId);
                    const otherName = otherNode?.data?.name || 'Entidad';

                    const card = isSource
                      ? `${edge.sourceCardinality || '1'} ➜ ${edge.targetCardinality || '*'}`
                      : `${edge.targetCardinality || '*'} ➜ ${edge.sourceCardinality || '1'}`;

                    return (
                      <View key={edge.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <Text style={styles.edgeTypeText}>
                            {edge.type || 'asociación'}
                          </Text>
                          <Text style={styles.fieldName}>{otherName}</Text>
                        </View>
                        <Text style={styles.cardinalityText}>{card}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Entidad aislada sin relaciones activas</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.bgSurface,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
    maxHeight: '80%',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.borderLight,
    alignSelf: 'center',
    marginBottom: THEME.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  classIcon: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stereotypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stereotypeText: {
    fontSize: 10,
    color: THEME.colors.accentPrimaryLight,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  abstractBadge: {
    fontSize: 9,
    color: THEME.colors.accentWarning,
    fontFamily: THEME.typography.fontFamilyMono,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  classNameText: {
    fontSize: THEME.typography.fontSizeLg,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  bodyScroll: {
    marginTop: THEME.spacing.md,
  },
  sectionCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSizeSm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1d26',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  visibilityText: {
    fontFamily: THEME.typography.fontFamilyMono,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.accentPrimaryLight,
    width: 12,
  },
  fieldName: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  fieldType: {
    fontSize: 11,
    color: THEME.colors.accentInfo,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  pkBadge: {
    backgroundColor: THEME.colors.badgePkBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.badgePkText,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  fkBadge: {
    backgroundColor: THEME.colors.badgeFkBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  fkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.badgeFkText,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  edgeTypeText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
    textTransform: 'uppercase',
  },
  cardinalityText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accentWarning,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  emptyText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
