import type { ReactNode } from "react";

import type { EncounterDefinition } from "@packbound/content";
import type {
  CommanderUpgradeId,
  LoadoutAction,
  PostPackLoadoutSuggestionSummary,
  RewardChoice,
  RewardOfferExplanation,
  TraitSummary,
  UpgradeProgressGroup
} from "@packbound/rules";
import type { CardDefId, CardInstanceId, ValidationError } from "@packbound/shared";

import type {
  LastRecordedCombatPanelView,
  UpcomingCombatPanelView
} from "../components/CombatResultPanel";
import type { CommandZonePanelView } from "../components/CommandZonePanel";
import type { CommanderUpgradePanelView } from "../components/CommanderUpgradePanel";
import type {
  DefaultPixiBattlefieldController,
  DefaultPixiBattlefieldView
} from "../components/DefaultPixiBattlefieldSection";
import type { LoadoutZonesPanelView } from "../components/LoadoutZonesPanel";
import type { RunGuideStat, RunGuideStep } from "../components/RunGuidePanel";

export type DefaultRunRouteView = {
  readonly battlefield: DefaultPixiBattlefieldView;
  readonly combat: {
    readonly lastRecorded: LastRecordedCombatPanelView;
    readonly upcoming: UpcomingCombatPanelView | undefined;
  };
  readonly commandZone: {
    readonly deployDisabled: boolean;
    readonly returnDisabled: boolean;
    readonly view: CommandZonePanelView;
  };
  readonly commanderUpgradePanelView: CommanderUpgradePanelView;
  readonly currentEncounter: EncounterDefinition | undefined;
  readonly isDefaultRoute: boolean;
  readonly loadoutZonesView: LoadoutZonesPanelView;
  readonly planningCheck: {
    readonly errors: readonly ValidationError[];
    readonly ok: boolean;
  };
  readonly postPackSuggestions: PostPackLoadoutSuggestionSummary;
  readonly rewards: {
    readonly description: string;
    readonly explanationsByChoiceId: ReadonlyMap<string, RewardOfferExplanation>;
    readonly playerGold: number;
    readonly rewardChoices: readonly RewardChoice[];
  };
  readonly runGuide: {
    readonly nextActionMessage: string;
    readonly runDetails: readonly RunGuideStat[];
    readonly stats: readonly RunGuideStat[];
    readonly steps: readonly RunGuideStep[];
  };
  readonly showDeveloperDetails: boolean;
  readonly traitSummary: TraitSummary;
};

export type DefaultRunRouteController = {
  readonly battlefield: DefaultPixiBattlefieldController;
  readonly cardName: (defId: CardDefId) => string;
  readonly onApplyCommanderUpgrade: (choiceId: CommanderUpgradeId) => void;
  readonly onApplyPostPackSuggestion: (
    cardInstanceId: CardInstanceId,
    action: LoadoutAction
  ) => void;
  readonly onDeployCommander: () => void;
  readonly onInspectCommander: () => void;
  readonly onInspectEncounterBoard: (cardInstanceId: CardInstanceId) => void;
  readonly onInspectEncounterSource: (cardInstanceId: CardInstanceId) => void;
  readonly onInspectEncounterSpellrail: (cardInstanceId: CardInstanceId) => void;
  readonly onOpenReward: (choiceId: string) => void;
  readonly onReturnCommander: () => void;
  readonly onUpgradeGroup: (group: UpgradeProgressGroup) => void;
  readonly renderLoadoutActions: (cardInstanceId: CardInstanceId) => ReactNode;
};
