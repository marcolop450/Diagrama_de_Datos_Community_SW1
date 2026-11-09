import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { 
  Search, 
  FolderKanban, 
  Database, 
  Radio, 
  Clock, 
  Layers, 
  ArrowRight,
  Play,
  ShieldCheck,
  AlertCircle
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/common/HeaderBar';
import { ProjectCard } from '../components/cards/ProjectCard';
import { useMobileProjectStore } from '../stores/projectStore';
import { useMobileCollabStore } from '../stores/collabStore';
import { mobileApi } from '../services/api';

interface ProjectsListScreenProps {
  onOpenDiagram: () => void;
}

export const ProjectsListScreen: React.FC<ProjectsListScreenProps> = ({ onOpenDiagram }) => {
  const { projects, loadProjects, openProject, isLoading } = useMobileProjectStore();
  const { joinSession } = useMobileCollabStore();

  const [activeTab, setActiveTab] = useState<'projects' | 'snapshots'>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickRoom, setQuickRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Estado para Snapshots de MongoDB Atlas
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [loadingSnaps, setLoadingSnaps] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'snapshots' && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
      loadSnapsForProject(projects[0].id);
    }
  }, [activeTab, projects]);

  const loadSnapsForProject = async (projId: string) => {
    try {
      setLoadingSnaps(true);
      const data = await mobileApi.getContinuousSnapshots(projId);
      setSnapshotsList(data);
    } catch {
      setSnapshotsList([]);
    } finally {
      setLoadingSnaps(false);
    }
  };

  const handleSelectSnapProject = (projId: string) => {
    setSelectedProjectId(projId);
    loadSnapsForProject(projId);
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchDesc = (p.description || '').toLowerCase().includes(q);
    const matchTag = (p.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchName || matchDesc || matchTag;
  });

  const handleSelectProject = async (id: string) => {
    const ok = await openProject(id);
    if (ok) {
      onOpenDiagram();
    }
  };

  const handleQuickJoinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || quickRoom).trim().toUpperCase();
    if (!code) {
      setRoomError('Ingresa un código de sala');
      return;
    }
    setRoomError(null);
    setIsJoining(true);
    const ok = await joinSession(code);
    setIsJoining(false);
    if (ok) {
      onOpenDiagram();
    } else {
      const storeErr = useMobileCollabStore.getState().error;
      setRoomError(storeErr || 'No se pudo conectar a la sala');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="Mis Proyectos UML" />

      {/* Pestañas: Modelos Activos vs Snapshots MongoDB Atlas */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'projects' && styles.tabBtnActive]}
          onPress={() => setActiveTab('projects')}
        >
          <FolderKanban size={14} color={activeTab === 'projects' ? THEME.colors.accentPrimaryLight : THEME.colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'projects' && styles.tabBtnTextActive]}>
            Modelos ({projects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'snapshots' && styles.tabBtnActive]}
          onPress={() => setActiveTab('snapshots')}
        >
          <Database size={14} color={activeTab === 'snapshots' ? THEME.colors.accentSuccess : THEME.colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'snapshots' && styles.tabBtnTextActive]}>
            MongoDB Atlas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Entrada a Sala Colaborativa */}
      {activeTab === 'projects' && (
        <View style={styles.joinCard}>
          <View style={styles.joinHeader}>
            <View style={styles.joinHeaderLeft}>
              <Radio size={15} color={THEME.colors.accentSuccess} />
              <Text style={styles.joinTitle}>Unirse a Pizarra en Vivo</Text>
            </View>
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>Tiempo Real</Text>
            </View>
          </View>
          <Text style={styles.joinDesc}>
            Ingresa el código de sala compartido por tu Arquitecto:
          </Text>
          <View style={styles.joinInputRow}>
            <TextInput
              style={styles.joinInput}
              value={quickRoom}
              onChangeText={(t) => {
                setQuickRoom(t.toUpperCase());
                if (roomError) setRoomError(null);
              }}
              placeholder="SW1-MCP"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <TouchableOpacity
              style={[styles.joinBtn, (!quickRoom.trim() || isJoining) && styles.joinBtnDisabled]}
              onPress={() => handleQuickJoinRoom()}
              disabled={!quickRoom.trim() || isJoining}
              activeOpacity={0.8}
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.joinBtnText}>Conectar</Text>
                  <ArrowRight size={13} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
          {roomError ? (
            <View style={styles.errorRow}>
              <AlertCircle size={12} color={THEME.colors.accentDanger} />
              <Text style={styles.errorText}>{roomError}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Buscador de Proyectos */}
      {activeTab === 'projects' && (
        <View style={styles.searchBox}>
          <Search size={16} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar modelo o etiqueta..."
            placeholderTextColor={THEME.colors.textMuted}
          />
        </View>
      )}

      {/* Contenido Principal */}
      {isLoading && projects.length === 0 ? (
        <View style={styles.centeredArea}>
          <ActivityIndicator size="large" color={THEME.colors.accentPrimary} />
          <Text style={styles.loadingText}>Consultando modelos en PostgreSQL 17...</Text>
        </View>
      ) : activeTab === 'projects' ? (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard project={item} onOpen={handleSelectProject} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadProjects}
              tintColor={THEME.colors.accentPrimary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Layers size={32} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>Ningún modelo encontrado</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No hay modelos que coincidan con tu búsqueda.'
                  : 'Crea tu primer modelo UML en la versión web para visualizarlo aquí.'}
              </Text>
            </View>
          }
        />
      ) : (
        /* VISTA DE INSTANTÁNEAS MONGODB ATLAS */
        <ScrollView style={styles.snapshotsContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionSubtitle}>Selecciona un modelo para ver sus instantáneas:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projChipsScroll}>
            {projects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.projChip, isSelected && styles.projChipActive]}
                  onPress={() => handleSelectSnapProject(p.id)}
                >
                  <Text style={[styles.projChipText, isSelected && styles.projChipTextActive]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loadingSnaps ? (
            <View style={styles.centeredArea}>
              <ActivityIndicator size="small" color={THEME.colors.accentSuccess} />
              <Text style={styles.loadingText}>Consultando MongoDB Atlas...</Text>
            </View>
          ) : snapshotsList.length > 0 ? (
            <View style={{ gap: 12, marginTop: 12, paddingBottom: 30 }}>
              {snapshotsList.map((snap) => {
                const code = snap.sessionCode || 'SW1-XXX';
                const source = snap.persistenceSource || 'MONGODB_ATLAS';
                const status = snap.status || 'SUSPENDED';
                const classes = snap.classesCount ?? snap.nodesCount ?? 0;
                const rels = snap.relationshipsCount ?? snap.edgesCount ?? 0;
                const msgs = snap.messagesCount ?? snap.chatMessagesCount ?? 0;
                const parts = snap.participantsCount ?? 1;
                const author = snap.savedByUserName || snap.hostName || 'Arquitecto';
                const rawDate = snap.savedAt || snap.createdAt;
                let dateStr = 'Reciente';
                if (rawDate) {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) {
                    dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  }
                }

                return (
                  <View key={snap.id} style={styles.snapCard}>
                    <View style={styles.snapHeader}>
                      <View style={styles.snapBadges}>
                        <View style={styles.codePill}>
                          <Text style={styles.codePillText}>{code}</Text>
                        </View>
                        <View style={styles.sourcePill}>
                          <Text style={styles.sourcePillText}>{source}</Text>
                        </View>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusPillText}>{status}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.resumePill}
                        onPress={() => handleQuickJoinRoom(code)}
                        activeOpacity={0.8}
                      >
                        <Play size={12} color="#ffffff" />
                        <Text style={styles.resumePillText}>Conectar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.snapMetricsRow}>
                      <Text style={styles.snapMetric}>{classes} Clases</Text>
                      <Text style={styles.snapMetric}>{rels} Relaciones</Text>
                      <Text style={styles.snapMetric}>{msgs} Mensajes</Text>
                      <Text style={styles.snapMetric}>{parts} Participantes</Text>
                    </View>

                    <View style={styles.snapFooter}>
                      <Text style={styles.snapAuthor}>Por: {author}</Text>
                      <Text style={styles.snapDate}>{dateStr}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Database size={32} color={THEME.colors.accentSuccess} />
              <Text style={styles.emptyTitle}>Sin instantáneas persistidas</Text>
              <Text style={styles.emptyDesc}>
                Este modelo no tiene sesiones colaborativas suspendidas en MongoDB Atlas.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  quickBar: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    gap: 8,
    backgroundColor: THEME.colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  quickInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 10,
    height: 38,
  },
  quickInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamilyMono,
    fontSize: 12,
  },
  quickJoinBtn: {
    width: 38,
    height: 38,
    backgroundColor: THEME.colors.accentPrimary,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgCard,
  },
  tabBtnActive: {
    borderColor: THEME.colors.accentPrimary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabBtnText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: THEME.colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    backgroundColor: THEME.colors.bgSurface,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 12,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  centeredArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.lg,
    marginTop: 20,
    marginHorizontal: THEME.spacing.md,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  snapshotsContainer: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
  },
  projChipsScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  projChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    marginRight: 8,
  },
  projChipActive: {
    borderColor: THEME.colors.accentSuccess,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  projChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  projChipTextActive: {
    color: THEME.colors.accentSuccessLight,
    fontWeight: '700',
  },
  snapCard: {
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
  },
  snapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  snapBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  codePill: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codePillText: {
    color: THEME.colors.accentPrimaryLight,
    fontSize: 10,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
  },
  sourcePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourcePillText: {
    color: THEME.colors.accentSuccess,
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  statusPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    color: THEME.colors.accentWarning,
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.accentPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resumePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  snapMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1d26',
    flexWrap: 'wrap',
  },
  snapMetric: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  snapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a1d26',
  },
  snapAuthor: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
  },
  snapDate: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamilyMono,
  },
  joinCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#161922',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 12,
  },
  joinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  joinHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveTagText: {
    color: THEME.colors.accentSuccess,
    fontSize: 9,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
  },
  joinDesc: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
  },
  joinInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: '#0F1219',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262A36',
    color: THEME.colors.textPrimary,
    fontFamily: THEME.typography.fontFamilyMono,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: THEME.colors.accentPrimary,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  joinBtnDisabled: {
    opacity: 0.45,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    color: THEME.colors.accentDanger,
    fontSize: 11,
  },
});
