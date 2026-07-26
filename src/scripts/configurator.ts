import {
  configuratorFinishes,
  configuratorSpaces,
  configuratorStyles,
  getConfiguratorRecommendation as getRecommendation,
  isConfiguratorSelection as isSelection,
  type ConfiguratorSelection,
} from '~/data/site';

export { configuratorFinishes, configuratorSpaces, configuratorStyles };
export type { ConfiguratorSelection };

export const isConfiguratorSelection = isSelection;

export const getConfiguratorRecommendation = (selection: ConfiguratorSelection) => getRecommendation(selection);

export const buildConfiguratorQuoteUrl = (selection: ConfiguratorSelection) => {
  const params = new URLSearchParams(selection);
  return `/quote?${params.toString()}`;
};

export const projectTypeForSpace: Record<string, string> = {
  garage: 'Residential garage',
  patio: 'Other',
  commercial: 'Commercial space',
  interior: 'Residential interior',
  countertop: 'Countertops',
};

export const finishPreferenceForFinish: Record<string, string> = {
  flake: 'PRVN Flake System',
  quartz: 'PRVN Quartz System',
  metallic: 'PRVN Metallic System',
};

export const finishStyleForStyle: Record<string, string> = {
  clean: 'Clean',
  industrial: 'Industrial',
  luxury: 'Luxury',
  bold: 'Bold',
  'blue-accent': 'Blue Accent',
  neutral: 'Neutral',
};
