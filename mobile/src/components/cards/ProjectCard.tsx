import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  FolderKanban, 
  Layers, 
  GitFork, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { DiagramProjectSummary } from '../../types/diagram';

interface ProjectCardProps {
  project: DiagramProjectSummary;
  onOpen: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen }) => {
  const normScore = project.normalizationScore ?? 100;
  const normLevel = project.normalizationLevel ?? '3NF';

  const isNormHigh = normScore >= 90;
  const isNormMid = normScore >= 70 && normScore < 90;

  const normBg = isNormHigh
    ? 'rgba(16, 185, 129, 0.12)'
    : isNormMid
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(239, 68, 68, 0.12)';

  const normBorder = isNormHigh
    ? 'rgba(16, 185, 129, 0.3)'
    : isNormMid
    ? 'rgba(245, 158, 11, 0.3)'
    : 'rgba(239, 68, 68, 0.3)';

  const normTextColor = isNormHigh
    ? THEME.colors.accentSuccessLight
    : isNormMid
    ? THEME.colors.accentWarning
    : THEME.colors.accentDanger;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpen(project.id)}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={styles.iconBox}>
            <FolderKanban size={16} color={THEME.colors.accentPrimaryLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName} numberOfLines={1}>
              {project.name}
            </Text>
            <Text style={styles.versionText}>
              Versión {project.version || 'v1.0.0'}
            </Text>
          </View>
        </View>

        <View style={[styles.normBadge, { backgroundColor: normBg, borderColor: normBorder }]}>
          <ShieldCheck size={12} color={normTextColor} />
          <Text style={[styles.normBadgeText, { color: normTextColor }]}>
            {normLevel} • {normScore}%
          </Text>
        </View>
      </View>

      {project.description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {project.description}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.statGroup}>
          <View style={styles.statItem}>
            <Layers size={12} color={THEME.colors.textMuted} />
            <Text style={styles.statText}>
              {project.classesCount ?? 0} Clases
            </Text>
          </View>
          <View style={styles.statItem}>
            <GitFork size={12} color={THEME.colors.textMuted} />
            <Text style={styles.statText}>
              {project.relationshipsCount ?? 0} Relaciones
            </Text>
          </View>
        </View>

        <View style={styles.openPill}>
          <Text style={styles.openPillText}>Abrir Visor</Text>
          <ChevronRight size={14} color={THEME.colors.accentPrimaryLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: THEME.typography.fontSizeSm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  versionText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMono,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  normBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  normBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamilyMono,
  },
  descText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    paddingTop: 8,
  },
  statGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accentPrimaryLight,
  },
});
