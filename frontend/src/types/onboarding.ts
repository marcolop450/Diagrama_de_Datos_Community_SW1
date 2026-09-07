export interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  targetSelector?: string;
  placement?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  icon: 'Layers' | 'Box' | 'Edit3' | 'GitFork' | 'Code2' | 'Sparkles' | 'CheckCircle2';
  badge: string;
  actionHint?: string;
}
